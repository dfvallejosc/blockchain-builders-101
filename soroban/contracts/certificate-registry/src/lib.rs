#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env};

pub use types::*;

#[contract]
pub struct CertificateRegistry;

mod test;
mod types;

const TTL_THRESHOLD: u32 = 100;

#[contractimpl]
impl CertificateRegistry {
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn authorize_issuer(env: Env, issuer: Address) -> Result<(), Error> {
        let admin = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Admin)
            .ok_or(Error::IssuerUnknown)?;
        admin.require_auth();

        env.storage()
            .persistent()
            .set(&DataKey::Issuer(issuer.clone()), &IssuerStatus::Authorized);
        Self::extend_issuer(env.clone(), issuer);
        Self::extend_instance(env);
        Ok(())
    }

    pub fn revoke_issuer(env: Env, issuer: Address) -> Result<(), Error> {
        let admin = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Admin)
            .ok_or(Error::IssuerUnknown)?;
        admin.require_auth();

        let key = DataKey::Issuer(issuer.clone());
        if !env.storage().persistent().has(&key) {
            return Err(Error::IssuerUnknown);
        }

        env.storage().persistent().set(&key, &IssuerStatus::Revoked);
        Self::extend_issuer(env.clone(), issuer);
        Self::extend_instance(env);
        Ok(())
    }

    pub fn get_issuer_status(env: Env, issuer: Address) -> IssuerStatus {
        env.storage()
            .persistent()
            .get(&DataKey::Issuer(issuer))
            .unwrap_or(IssuerStatus::Unknown)
    }
}

impl CertificateRegistry {
    fn extend_issuer(env: Env, issuer: Address) {
        env.storage().persistent().extend_ttl(
            &DataKey::Issuer(issuer),
            TTL_THRESHOLD,
            env.storage().max_ttl(),
        );
    }

    fn extend_instance(env: Env) {
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, env.storage().max_ttl());
    }
}
