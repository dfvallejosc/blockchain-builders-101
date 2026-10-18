#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{
        storage::{Instance as _, Persistent as _},
        Address as _, Ledger,
    },
    Address, BytesN, Env,
};

fn setup() -> (Env, CertificateRegistryClient<'static>, Address) {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(CertificateRegistry, (admin.clone(),));
    let client = CertificateRegistryClient::new(&env, &contract_id);
    (env, client, admin)
}

fn authorized_issuer(env: &Env, client: &CertificateRegistryClient<'_>) -> Address {
    let issuer = Address::generate(env);
    client.authorize_issuer(&issuer);
    issuer
}

fn fingerprint(env: &Env, byte: u8) -> BytesN<32> {
    BytesN::from_array(env, &[byte; 32])
}

#[test]
fn register_then_get_status_is_valid() {
    let (env, client, _) = setup();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);
    let issuer = authorized_issuer(&env, &client);
    let certificate_fingerprint = fingerprint(&env, 1);

    client.register(&issuer, &certificate_fingerprint, &2_000);

    assert_eq!(
        client.get_status(&certificate_fingerprint),
        CertificateStatus {
            verdict: Verdict::Valid,
            issuer: Some(issuer),
            valid_until: 2_000,
        }
    );
}

#[test]
fn get_status_of_unknown_fingerprint_is_not_found() {
    let (env, client, _) = setup();

    assert_eq!(
        client.get_status(&fingerprint(&env, 2)),
        CertificateStatus {
            verdict: Verdict::NotFound,
            issuer: None,
            valid_until: 0,
        }
    );
}

#[test]
fn register_with_unauthorized_issuer_fails() {
    let (env, client, _) = setup();
    env.mock_all_auths();
    let unauthorized = Address::generate(&env);
    let never_registered = fingerprint(&env, 3);
    assert_eq!(
        client.try_register(&unauthorized, &never_registered, &2_000),
        Err(Ok(Error::IssuerNotAuthorized))
    );

    let revoked = authorized_issuer(&env, &client);
    client.revoke_issuer(&revoked);
    assert_eq!(
        client.try_register(&revoked, &fingerprint(&env, 4), &2_000),
        Err(Ok(Error::IssuerNotAuthorized))
    );
}

#[test]
fn register_duplicate_fingerprint_fails() {
    let (env, client, _) = setup();
    env.mock_all_auths();
    let issuer = authorized_issuer(&env, &client);
    let certificate_fingerprint = fingerprint(&env, 5);
    client.register(&issuer, &certificate_fingerprint, &2_000);

    assert_eq!(
        client.try_register(&issuer, &certificate_fingerprint, &3_000),
        Err(Ok(Error::AlreadyRegistered))
    );
    let second_issuer = authorized_issuer(&env, &client);
    assert_eq!(
        client.try_register(&second_issuer, &certificate_fingerprint, &3_000),
        Err(Ok(Error::AlreadyRegistered))
    );
    assert_eq!(
        client.get_status(&certificate_fingerprint),
        CertificateStatus {
            verdict: Verdict::Valid,
            issuer: Some(issuer),
            valid_until: 2_000,
        }
    );
}

#[test]
fn register_with_past_validity_fails() {
    let (env, client, _) = setup();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);
    let issuer = authorized_issuer(&env, &client);

    assert_eq!(
        client.try_register(&issuer, &fingerprint(&env, 6), &1_000),
        Err(Ok(Error::InvalidValidity))
    );
    assert_eq!(
        client.try_register(&issuer, &fingerprint(&env, 7), &999),
        Err(Ok(Error::InvalidValidity))
    );
    client.register(&issuer, &fingerprint(&env, 8), &1_001);
}

#[test]
fn status_is_valid_at_valid_until_and_expired_one_second_later() {
    let (env, client, _) = setup();
    env.mock_all_auths();
    let issuer = authorized_issuer(&env, &client);
    let certificate_fingerprint = fingerprint(&env, 9);
    client.register(&issuer, &certificate_fingerprint, &2_000);

    env.ledger().set_timestamp(2_000);
    assert_eq!(
        client.get_status(&certificate_fingerprint).verdict,
        Verdict::Valid
    );
    env.ledger().set_timestamp(2_001);
    assert_eq!(
        client.get_status(&certificate_fingerprint).verdict,
        Verdict::Expired
    );
}

#[test]
fn register_requires_the_issuers_signature() {
    let (env, client, _) = setup();
    env.mock_all_auths();
    let issuer = authorized_issuer(&env, &client);
    let certificate_fingerprint = fingerprint(&env, 10);

    client.register(&issuer, &certificate_fingerprint, &2_000);

    assert!(env.auths().iter().any(|(address, _)| address == &issuer));

    let (unmocked_env, unmocked_client, _) = setup();
    unmocked_env.mock_all_auths();
    let unmocked_issuer = authorized_issuer(&unmocked_env, &unmocked_client);
    unmocked_env.set_auths(&[]);
    assert!(unmocked_client
        .try_register(&unmocked_issuer, &fingerprint(&unmocked_env, 11), &2_000)
        .is_err());
}

#[test]
fn status_is_issuer_revoked_after_revocation() {
    let (env, client, _) = setup();
    env.mock_all_auths();
    let issuer = authorized_issuer(&env, &client);
    let certificate_fingerprint = fingerprint(&env, 12);
    client.register(&issuer, &certificate_fingerprint, &2_000);
    client.revoke_issuer(&issuer);

    env.ledger().set_timestamp(2_001);
    assert_eq!(
        client.get_status(&certificate_fingerprint).verdict,
        Verdict::IssuerRevoked
    );
}

#[test]
fn get_issuer_status_is_unknown_by_default() {
    let (env, client, _) = setup();
    let issuer = Address::generate(&env);

    assert_eq!(client.get_issuer_status(&issuer), IssuerStatus::Unknown);
}

#[test]
fn authorize_issuer_marks_it_authorized() {
    let (env, client, admin) = setup();
    let issuer = Address::generate(&env);
    env.mock_all_auths();

    client.authorize_issuer(&issuer);

    assert_eq!(env.auths()[0].0, admin);
    assert_eq!(client.get_issuer_status(&issuer), IssuerStatus::Authorized);
}

#[test]
fn revoke_issuer_marks_it_revoked() {
    let (env, client, _) = setup();
    let issuer = Address::generate(&env);
    env.mock_all_auths();

    client.authorize_issuer(&issuer);
    client.revoke_issuer(&issuer);

    assert_eq!(client.get_issuer_status(&issuer), IssuerStatus::Revoked);
}

#[test]
fn revoke_unknown_issuer_fails() {
    let (env, client, _) = setup();
    let issuer = Address::generate(&env);
    env.mock_all_auths();

    assert_eq!(
        client.try_revoke_issuer(&issuer),
        Err(Ok(Error::IssuerUnknown))
    );
}

#[test]
fn reauthorize_revoked_issuer_returns_to_authorized() {
    let (env, client, _) = setup();
    let issuer = Address::generate(&env);
    env.mock_all_auths();

    client.authorize_issuer(&issuer);
    client.revoke_issuer(&issuer);
    client.authorize_issuer(&issuer);

    assert_eq!(client.get_issuer_status(&issuer), IssuerStatus::Authorized);
}

#[test]
fn authorize_issuer_requires_admin_signature() {
    let (env, client, _) = setup();
    let issuer = Address::generate(&env);

    assert!(client.try_authorize_issuer(&issuer).is_err());
}

#[test]
fn annul_marks_the_certificate_annulled() {
    let (env, client, _) = setup();
    env.mock_all_auths();
    let issuer = authorized_issuer(&env, &client);
    let certificate_fingerprint = fingerprint(&env, 13);
    client.register(&issuer, &certificate_fingerprint, &2_000);

    client.annul(&issuer, &certificate_fingerprint);

    assert_eq!(
        client.get_status(&certificate_fingerprint).verdict,
        Verdict::Annulled
    );
}

#[test]
fn annul_unknown_fingerprint_fails() {
    let (env, client, _) = setup();
    env.mock_all_auths();
    let issuer = authorized_issuer(&env, &client);

    assert_eq!(
        client.try_annul(&issuer, &fingerprint(&env, 14)),
        Err(Ok(Error::NotFound))
    );
}

#[test]
fn annul_twice_fails() {
    let (env, client, _) = setup();
    env.mock_all_auths();
    let issuer = authorized_issuer(&env, &client);
    let certificate_fingerprint = fingerprint(&env, 15);
    client.register(&issuer, &certificate_fingerprint, &2_000);
    client.annul(&issuer, &certificate_fingerprint);

    assert_eq!(
        client.try_annul(&issuer, &certificate_fingerprint),
        Err(Ok(Error::AlreadyAnnulled))
    );
}

#[test]
fn annul_by_another_authorized_issuer_fails() {
    let (env, client, _) = setup();
    env.mock_all_auths();
    let issuer = authorized_issuer(&env, &client);
    let other_issuer = authorized_issuer(&env, &client);
    let certificate_fingerprint = fingerprint(&env, 16);
    client.register(&issuer, &certificate_fingerprint, &2_000);

    assert_eq!(
        client.try_annul(&other_issuer, &certificate_fingerprint),
        Err(Ok(Error::NotCertificateIssuer))
    );
    assert_eq!(
        client.get_status(&certificate_fingerprint).verdict,
        Verdict::Valid
    );
}

#[test]
fn annul_by_revoked_issuer_fails() {
    let (env, client, _) = setup();
    env.mock_all_auths();
    let issuer = authorized_issuer(&env, &client);
    let certificate_fingerprint = fingerprint(&env, 17);
    client.register(&issuer, &certificate_fingerprint, &2_000);
    client.revoke_issuer(&issuer);

    assert_eq!(
        client.try_annul(&issuer, &certificate_fingerprint),
        Err(Ok(Error::IssuerNotAuthorized))
    );
}

#[test]
fn annul_requires_the_issuers_signature() {
    let (env, client, _) = setup();
    env.mock_all_auths();
    let issuer = authorized_issuer(&env, &client);
    let certificate_fingerprint = fingerprint(&env, 18);
    client.register(&issuer, &certificate_fingerprint, &2_000);
    client.annul(&issuer, &certificate_fingerprint);
    assert!(env.auths().iter().any(|(address, _)| address == &issuer));

    let (unmocked_env, unmocked_client, _) = setup();
    unmocked_env.mock_all_auths();
    let unmocked_issuer = authorized_issuer(&unmocked_env, &unmocked_client);
    let unmocked_fingerprint = fingerprint(&unmocked_env, 19);
    unmocked_client.register(&unmocked_issuer, &unmocked_fingerprint, &2_000);
    unmocked_env.set_auths(&[]);
    assert!(unmocked_client
        .try_annul(&unmocked_issuer, &unmocked_fingerprint)
        .is_err());
}

#[test]
fn revoked_issuer_takes_priority_over_annulled() {
    let (env, client, _) = setup();
    env.mock_all_auths();
    let issuer = authorized_issuer(&env, &client);
    let certificate_fingerprint = fingerprint(&env, 20);
    client.register(&issuer, &certificate_fingerprint, &2_000);
    client.annul(&issuer, &certificate_fingerprint);
    client.revoke_issuer(&issuer);

    assert_eq!(
        client.get_status(&certificate_fingerprint).verdict,
        Verdict::IssuerRevoked
    );
}

#[test]
fn reauthorized_issuer_certificates_become_valid_again() {
    let (env, client, _) = setup();
    env.mock_all_auths();
    let issuer = authorized_issuer(&env, &client);
    let annulled_fingerprint = fingerprint(&env, 21);
    let active_fingerprint = fingerprint(&env, 22);
    client.register(&issuer, &annulled_fingerprint, &2_000);
    client.register(&issuer, &active_fingerprint, &2_000);
    client.annul(&issuer, &annulled_fingerprint);
    client.revoke_issuer(&issuer);
    client.authorize_issuer(&issuer);

    assert_eq!(
        client.get_status(&annulled_fingerprint).verdict,
        Verdict::Annulled
    );
    assert_eq!(
        client.get_status(&active_fingerprint).verdict,
        Verdict::Valid
    );
}

#[test]
fn extend_ttl_renews_certificate_issuer_and_instance() {
    let (env, client, _) = setup();
    env.mock_all_auths();
    let issuer = authorized_issuer(&env, &client);
    let certificate_fingerprint = fingerprint(&env, 23);
    client.register(&issuer, &certificate_fingerprint, &2_000);

    let contract_id = client.address.clone();
    env.ledger()
        .set_sequence_number(env.ledger().get().sequence_number + 1_000);
    env.set_auths(&[]);
    client.extend_ttl(&certificate_fingerprint);

    env.as_contract(&contract_id, || {
        let max_ttl = env.storage().max_ttl();
        assert_eq!(
            env.storage()
                .persistent()
                .get_ttl(&DataKey::Certificate(certificate_fingerprint.clone())),
            max_ttl
        );
        assert_eq!(
            env.storage()
                .persistent()
                .get_ttl(&DataKey::Issuer(issuer.clone())),
            max_ttl
        );
        assert_eq!(env.storage().instance().get_ttl(), max_ttl);
    });
}

#[test]
fn extend_ttl_unknown_fingerprint_fails() {
    let (env, client, _) = setup();

    assert_eq!(
        client.try_extend_ttl(&fingerprint(&env, 24)),
        Err(Ok(Error::NotFound))
    );
}

#[test]
fn writes_extend_ttl_to_max() {
    let (env, client, _) = setup();
    env.mock_all_auths();
    let issuer = authorized_issuer(&env, &client);
    let certificate_fingerprint = fingerprint(&env, 25);
    client.register(&issuer, &certificate_fingerprint, &2_000);

    let contract_id = client.address.clone();
    env.as_contract(&contract_id, || {
        let max_ttl = env.storage().max_ttl();
        assert_eq!(
            env.storage()
                .persistent()
                .get_ttl(&DataKey::Certificate(certificate_fingerprint.clone())),
            max_ttl
        );
        assert_eq!(
            env.storage()
                .persistent()
                .get_ttl(&DataKey::Issuer(issuer.clone())),
            max_ttl
        );
        assert_eq!(env.storage().instance().get_ttl(), max_ttl);
    });

    let second_issuer = Address::generate(&env);
    client.authorize_issuer(&second_issuer);
    env.as_contract(&contract_id, || {
        let max_ttl = env.storage().max_ttl();
        assert_eq!(
            env.storage()
                .persistent()
                .get_ttl(&DataKey::Issuer(second_issuer.clone())),
            max_ttl
        );
        assert_eq!(env.storage().instance().get_ttl(), max_ttl);
    });
}
