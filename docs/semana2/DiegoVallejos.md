# Historias de usuario individuales

**Nombre:** Diego Vallejos

**Usuario de GitHub:** dfvallejosc

---

## Mis historias de usuario

1. Como emisor, quiero emitir un certificado con un código QR a partir de los datos del trabajador, para que se compruebe solo, sin tener que atender llamadas de confirmación.
2. Como coordinador de SST, quiero ver, al escanear el QR, si el certificado es auténtico, para no autorizar a nadie con un documento falso o alterado.
3. Como emisor, quiero registrar a un trabajador con su nombre y número de documento, para emitirle certificados sin volver a escribir sus datos cada vez.
4. Como emisor, quiero revisar los datos del certificado antes de confirmar su emisión, para no tener que anularlo por un error de digitación.
5. Como emisor, quiero ver el historial de los certificados que he emitido con su estado, para saber cuáles siguen vigentes, cuáles vencieron y cuáles anulé.
6. Como emisor, quiero ver los certificados de un trabajador registrado, para saber cuáles tiene vigentes y cuáles debo renovarle.

## La más importante y por qué

| Orden de importancia | Historia # | Por qué |
| :---: | :---: | --- |
| 1 (la más importante) | 1 | Es lo que la propuesta de valor le promete al emisor, el usuario principal del Problem Brief: que sus certificados se comprueben solos y que deje de atender llamadas de confirmación. Sin un certificado emitido con QR no hay nada que verificar, y las demás historias no tienen sentido. |
| 2 | 2 | Es la otra mitad del recorrido. Ataca la falsificación, la fricción prioritaria del Problem Brief, y con la historia 1 completa el ciclo de emitir y comprobar. |
| 3 | 3 | El flujo de usuario exige este paso antes de emitir, y requiere la autorización del trabajador para tratar sus datos. Sin trabajador registrado no se puede emitir. |
| 4 | 4 | Es el paso 5 del flujo y evita el trabajo posterior de anular un certificado emitido con datos erróneos. Mejora la emisión, pero el recorrido existe sin esta pantalla. |
| 5 | 5 | Es la base del panel del emisor y un requisito para poder anular certificados. Ayuda a llevar el control, pero el emisor y el coordinador completan el recorrido sin ella. |
| 6 (la menos importante) | 6 | Ayuda a ofrecer la renovación antes de que venza un certificado. Es comodidad para el emisor y depende de que ya existan trabajadores y certificados registrados. |
