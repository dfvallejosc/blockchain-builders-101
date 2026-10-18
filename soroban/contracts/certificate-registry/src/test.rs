#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup() -> (Env, CertificateRegistryClient<'static>, Address) {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(CertificateRegistry, (admin.clone(),));
    let client = CertificateRegistryClient::new(&env, &contract_id);
    (env, client, admin)
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
