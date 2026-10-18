#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
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
