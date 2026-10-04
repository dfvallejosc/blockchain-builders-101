# Historias de usuario — Diego Vallejos

**Proyecto: HabilitApp**

## Mis historias de usuario

Ordenadas de mayor a menor importancia.

1. Como emisor, quiero emitir un certificado con un código QR a partir de los datos del trabajador, para que se compruebe solo, sin tener que atender llamadas de confirmación.
2. Como coordinador de SST, quiero ver, al escanear el QR, si el certificado es auténtico, para no autorizar a nadie con un documento falso o alterado.
3. Como emisor, quiero registrar a un trabajador con su nombre y número de documento, para emitirle certificados sin volver a escribir sus datos cada vez.
4. Como emisor, quiero revisar los datos del certificado antes de confirmar su emisión, para no tener que anularlo por un error de digitación.
5. Como emisor, quiero ver el historial de los certificados que he emitido con su estado, para saber cuáles siguen vigentes, cuáles vencieron y cuáles anulé.
6. Como emisor, quiero ver los certificados de un trabajador registrado, para saber cuáles tiene vigentes y cuáles debo renovarle.

## La más importante y por qué

La más importante es la **historia 1: emitir un certificado con un código QR**. Es lo que la propuesta de valor le promete al emisor, el usuario principal del Problem Brief: que sus certificados se comprueben solos y que deje de atender llamadas de confirmación. Sin un certificado emitido con QR no hay nada que verificar, y las demás historias no tienen sentido.

El orden de las demás sigue su aporte al recorrido principal del producto:

- **Historia 2 (comprobar que es auténtico):** es la otra mitad del recorrido. Ataca la falsificación, la fricción prioritaria del Problem Brief. Con la historia 1 completa el ciclo de emitir y comprobar.
- **Historia 3 (registrar al trabajador):** el flujo de usuario exige este paso antes de emitir, y requiere la autorización del trabajador para tratar sus datos.
- **Historia 4 (revisar antes de confirmar):** es el paso 5 del flujo y evita el trabajo posterior de anular un certificado emitido con datos erróneos.
- **Historias 5 y 6 (historial y certificados del trabajador):** mejoran la experiencia y ayudan a renovar a tiempo, pero el emisor y el coordinador completan el recorrido sin ellas. Por eso quedan después en el orden.
