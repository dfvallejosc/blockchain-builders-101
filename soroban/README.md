# Contrato de registro de certificados

Este contrato de Soroban permite que emisores autorizados registren certificados usando una huella criptográfica de 32 bytes, consulten su estado y anulen sus registros. La red almacena la huella y los datos mínimos necesarios para verificar el certificado; no almacena datos personales. El administrador autoriza y revoca emisores.

## Funciones

| Función | Firma | Descripción |
| --- | --- | --- |
| `__constructor` | `__constructor(admin: Address)` | Corre una sola vez al desplegar y fija al administrador. |
| `authorize_issuer` | `authorize_issuer(issuer: Address) -> Result<(), Error>` | Autoriza a un emisor. Requiere la firma del administrador. |
| `revoke_issuer` | `revoke_issuer(issuer: Address) -> Result<(), Error>` | Revoca a un emisor existente. Requiere la firma del administrador. |
| `get_issuer_status` | `get_issuer_status(issuer: Address) -> IssuerStatus` | Consulta si el emisor está autorizado, revocado o no registrado. |
| `register` | `register(issuer: Address, fingerprint: BytesN<32>, valid_until: u64) -> Result<(), Error>` | Registra una huella única con fecha de vencimiento. Requiere la firma del emisor autorizado. |
| `extend_ttl` | `extend_ttl(fingerprint: BytesN<32>) -> Result<(), Error>` | No exige firma. Alarga al máximo el tiempo de vida del certificado, el de su emisor y el de la instancia. Falla con `NotFound` si la huella no existe. |
| `annul` | `annul(issuer: Address, fingerprint: BytesN<32>) -> Result<(), Error>` | Anula un certificado del emisor. Requiere la firma del emisor autorizado que lo registró. |
| `get_status` | `get_status(fingerprint: BytesN<32>) -> CertificateStatus` | Consulta el veredicto, el emisor y la fecha de vencimiento asociados a una huella. |

Los veredictos de `get_status` son `Valid`, `Expired`, `Annulled`, `IssuerRevoked` y `NotFound`. El estado de emisor puede ser `Unknown`, `Authorized` o `Revoked`.

**Prioridad del veredicto**, de mayor a menor: `NotFound`, `IssuerRevoked`, `Annulled`, `Expired`, `Valid`. El vencimiento no se guarda: se calcula al consultar y un certificado es `Expired` solo si la hora del ledger es mayor que `valid_until` (segundos Unix). `register` rechaza un `valid_until` que no sea posterior a la hora actual del ledger.

**Tiempo de vida (TTL).** Emisores y certificados van en almacenamiento persistente, y el administrador en el de instancia. Cada escritura renueva al máximo el TTL de lo que toca y el de la instancia. Si una entrada llega a archivarse, la llamada falla en vez de devolver `NotFound`: hay que restaurarla antes de consultar.

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

Desplegado en testnet (red `Test SDF Network ; September 2015`).

| Dato | Valor |
| --- | --- |
| ID del contrato | `CAPRNQ7LVZWH47D4ZBDKY2OUICZ5FULE223IRWTOJR3HLR6ZEBAD3GPD` |
| Contrato en el explorador | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAPRNQ7LVZWH47D4ZBDKY2OUICZ5FULE223IRWTOJR3HLR6ZEBAD3GPD) |
| Administrador (cuenta de prueba) | `GDJGGBJNM6LSHTDAPCE73TBKAG6C4KSQ4WPP2JJMXYWMSX2SCHBSZWWP` |
| Emisor de prueba | `GAOPBI753VBDVALF43O3KK2YWD3HR3ZEGBLGRLH6QIJSZRKBFH3L7RJM` |
| Hash del WASM | `4b3c235e10422e4d096589ca2399f2b1f0c7ef96e754dc58fe96fa1b055506e6` |

Las cuentas son solo de testnet y sus llaves viven en el almacén local del Stellar CLI, no en el repositorio. Testnet se reinicia de vez en cuando; si eso pasa, hay que volver a desplegar con el comando de la sección anterior y actualizar este ID.

### Transacciones de prueba

Flujo completo con un certificado de prueba (la huella es el SHA-256 de un texto inventado, no un dato real):

| Paso | Transacción |
| --- | --- |
| Subir el código del contrato | [c7970c92…8772e](https://stellar.expert/explorer/testnet/tx/c7970c92732d2d4e4ba6c87422f98e331d4e55430441ca0ae5ab0f6332e8772e) |
| Crear el contrato con su administrador | [24b8cdd1…e2dd](https://stellar.expert/explorer/testnet/tx/24b8cdd1c81eb792a12a8eaf39ae73d024635b5553b013954aef4b720d80e2dd) |
| `authorize_issuer` (firma el administrador) | [e2c555c3…faf2](https://stellar.expert/explorer/testnet/tx/e2c555c3ade7cc918c24f85b23daae2a00e331357c33ea88855fc26f7b29faf2) |
| `register` (firma el emisor) | [ff971746…cf78](https://stellar.expert/explorer/testnet/tx/ff9717464363be834322be9f2f21df1319c6abfaea2f5a1f981f72b3fa3dcf78) |
| `annul` (firma el emisor) | [ace8a7c4…7d31](https://stellar.expert/explorer/testnet/tx/ace8a7c41227edd93e098646b41fde5ef9c9f81a3cde5f5645c0297d44fe7d31) |

`get_status` es una lectura y no genera transacción. Antes de anular devolvió `Valid`, y después `Annulled`.
