use soroban_sdk::{contracterror, contracttype, Address, BytesN};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    Issuer(Address),
    Certificate(BytesN<32>),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum IssuerStatus {
    Unknown,
    Authorized,
    Revoked,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Verdict {
    Valid,
    Expired,
    Annulled,
    IssuerRevoked,
    NotFound,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Certificate {
    pub issuer: Address,
    pub valid_until: u64,
    pub annulled: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CertificateStatus {
    pub verdict: Verdict,
    pub issuer: Option<Address>,
    pub valid_until: u64,
}

#[contracterror]
#[repr(u32)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Error {
    IssuerNotAuthorized = 1,
    AlreadyRegistered = 2,
    NotFound = 3,
    AlreadyAnnulled = 4,
    NotCertificateIssuer = 5,
    InvalidValidity = 6,
    IssuerUnknown = 7,
}
