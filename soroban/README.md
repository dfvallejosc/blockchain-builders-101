# Contrato de registro de certificados

Este contrato de Soroban permite que emisores autorizados registren certificados usando una huella criptográfica de 32 bytes, consulten su estado y anulen sus registros. La red almacena la huella y los datos mínimos necesarios para verificar el certificado; no almacena datos personales. El administrador autoriza y revoca emisores.

## Funciones

| Función | Firma | Descripción |
| --- | --- | --- |
| `authorize_issuer` | `authorize_issuer(issuer: Address) -> Result<(), Error>` | Autoriza a un emisor. Requiere la firma del administrador. |
| `revoke_issuer` | `revoke_issuer(issuer: Address) -> Result<(), Error>` | Revoca a un emisor existente. Requiere la firma del administrador. |
| `get_issuer_status` | `get_issuer_status(issuer: Address) -> IssuerStatus` | Consulta si el emisor está autorizado, revocado o no registrado. |
| `register` | `register(issuer: Address, fingerprint: BytesN<32>, valid_until: u64) -> Result<(), Error>` | Registra una huella única con fecha de vencimiento. Requiere la firma del emisor autorizado. |
| `extend_ttl` | `extend_ttl(fingerprint: BytesN<32>) -> Result<(), Error>` | Extiende la vigencia del almacenamiento de un certificado existente. |
| `annul` | `annul(issuer: Address, fingerprint: BytesN<32>) -> Result<(), Error>` | Anula un certificado del emisor. Requiere la firma del emisor autorizado que lo registró. |
| `get_status` | `get_status(fingerprint: BytesN<32>) -> CertificateStatus` | Consulta el veredicto, el emisor y la fecha de vencimiento asociados a una huella. |

Los veredictos de `get_status` son `Valid`, `Expired`, `Annulled`, `IssuerRevoked` y `NotFound`. El estado de emisor puede ser `Unknown`, `Authorized` o `Revoked`.

## Códigos de error

| Código | Error | Significado |
| ---: | --- | --- |
| 1 | `IssuerNotAuthorized` | El emisor no está autorizado. |
| 2 | `AlreadyRegistered` | La huella ya fue registrada. |
| 3 | `NotFound` | No existe un certificado con esa huella. |
| 4 | `AlreadyAnnulled` | El certificado ya fue anulado. |
| 5 | `NotCertificateIssuer` | El emisor indicado no registró el certificado. |
| 6 | `InvalidValidity` | La fecha de vencimiento no es posterior al tiempo actual del ledger. |
| 7 | `IssuerUnknown` | El emisor no está registrado. |

## Pruebas y compilación

Desde este directorio, ejecuta las pruebas locales sin acceso a la red:

```bash
cargo test --offline
```

Para comprobar el formato de Rust:

```bash
cargo fmt --all -- --check
```

Para compilar el contrato a WASM con Stellar CLI:

```bash
stellar contract build
```

El archivo generado queda en `target/wasm32v1-none/release/certificate_registry.wasm`.

## Despliegue

Después de compilar y configurar una identidad de administrador en Stellar CLI, el comando de despliegue a testnet es:

```bash
stellar contract deploy --wasm target/wasm32v1-none/release/certificate_registry.wasm \
  --source-account habilitapp-admin --network testnet --alias certificate-registry \
  -- --admin "$(stellar keys address habilitapp-admin)"
```

## Contrato en testnet

Pendiente: se completa tras el despliegue (TA-28).
