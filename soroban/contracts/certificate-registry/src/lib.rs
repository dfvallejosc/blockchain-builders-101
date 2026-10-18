#![no_std]
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env};

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

    pub fn register(
        env: Env,
        issuer: Address,
        fingerprint: BytesN<32>,
        valid_until: u64,
    ) -> Result<(), Error> {
        issuer.require_auth();

        let issuer_status = env
            .storage()
            .persistent()
            .get(&DataKey::Issuer(issuer.clone()))
            .unwrap_or(IssuerStatus::Unknown);
        if issuer_status != IssuerStatus::Authorized {
            return Err(Error::IssuerNotAuthorized);
        }

        if valid_until <= env.ledger().timestamp() {
            return Err(Error::InvalidValidity);
        }

        let key = DataKey::Certificate(fingerprint.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::AlreadyRegistered);
        }

        env.storage().persistent().set(
            &key,
            &Certificate {
                issuer: issuer.clone(),
                valid_until,
                annulled: false,
            },
        );
        Self::extend_certificate(env.clone(), fingerprint);
        Self::extend_issuer(env.clone(), issuer);
        Self::extend_instance(env);
        Ok(())
    }

    pub fn get_status(env: Env, fingerprint: BytesN<32>) -> CertificateStatus {
        let Some(certificate) = env
            .storage()
            .persistent()
            .get::<_, Certificate>(&DataKey::Certificate(fingerprint))
        else {
            return CertificateStatus {
                verdict: Verdict::NotFound,
                issuer: None,
                valid_until: 0,
            };
        };

        let issuer_status = env
            .storage()
            .persistent()
            .get(&DataKey::Issuer(certificate.issuer.clone()))
            .unwrap_or(IssuerStatus::Unknown);
        let verdict = Self::resolve_verdict(&certificate, issuer_status, env.ledger().timestamp());
        CertificateStatus {
            verdict,
            issuer: Some(certificate.issuer),
            valid_until: certificate.valid_until,
        }
    }
}

impl CertificateRegistry {
    fn resolve_verdict(cert: &Certificate, issuer_status: IssuerStatus, now: u64) -> Verdict {
        if issuer_status == IssuerStatus::Revoked {
            return Verdict::IssuerRevoked;
        }
        if cert.annulled {
            return Verdict::Annulled;
        }
        if now > cert.valid_until {
            return Verdict::Expired;
        }
        Verdict::Valid
    }

    fn extend_certificate(env: Env, fingerprint: BytesN<32>) {
        env.storage().persistent().extend_ttl(
            &DataKey::Certificate(fingerprint),
            TTL_THRESHOLD,
            env.storage().max_ttl(),
        );
    }

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
