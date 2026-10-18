# API de HabilitApp

## Registro en Stellar

La API usa PostgreSQL por defecto. Para activar el registro en Stellar configura `REGISTRY_DRIVER=stellar` y estas variables en `apps/api/.env`:

- `STELLAR_RPC_URL`: URL del RPC.
- `STELLAR_NETWORK_PASSPHRASE`: frase de red.
- `STELLAR_CONTRACT_ID`: contrato de registro.
- `STELLAR_MASTER_SECRET`: secreto maestro que deriva la cuenta de cada emisor.
- `STELLAR_ADMIN_SECRET`: secreto de la cuenta administradora.
- `STELLAR_SPONSOR_SECRET`: secreto de la cuenta que paga las reservas y las transacciones.

En el MVP HabilitApp usa custodia delegada: firma las operaciones del emisor con una cuenta derivada. El administrador y el patrocinador tienen secretos separados. Los secretos se guardan únicamente en variables de entorno y no se escriben en logs. No hay rotación de la llave maestra todavía; cambiarla produciría otras cuentas y rompería la asociación con los certificados existentes.

La red puede quedar adelantada si PostgreSQL falla después de confirmar una escritura. Un reintento corrige la base para anulaciones y revocaciones. El MVP tampoco tiene limpieza de cuentas, renovación programada de TTL, HSM, multifirma ni firma directa del emisor.
