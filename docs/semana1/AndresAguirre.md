# Propuesta individual — Andres Aguirre

## El problema

> El problema en una sola frase, sin mencionar blockchain.

A pesar de que toda institución universitaria tiene registro de sus graduados, no todas realizan la validación directa sobre la realización de exámenes Saber Pro que realiza el ICFES, y que termina de dar validez al título universitario.

## Quién sufre

> Identidad y contexto de las partes afectadas.

- Las instituciones públicas manejan una gran cantidad de contrataciones por lo que es díficil validar de manera cruzada cada título universitario tanto en la institución emisora como con el ICFES. Por lo que se da una gran cantidad de fraude de títulos en la actualidad.
- Las instituciones universitarias también sufren desprestigio cada vez que sale a la luz un fraude de alguno de sus graduados ya que no aseguran la validez final del título para las personas egresadas de dicha institución.
- Las entidades públicas que requieren validar los títulos deben comunicarse con cada institución diferente de sus posibles candidatos y validar de manera cruzada con los resultados expuestos por la el ICFES. 

## Resolución actual y costos

> Cómo se resuelve hoy y cuánto cuesta (dinero, tiempo, esfuerzo).

Hoy la verificación es manual y está fragmentada. La entidad contratante pide a cada universidad una certificación del título (por correo, oficio o trámite en línea) y, por separado, consulta al ICFES la presentación del Saber Pro. Luego cruza ambos resultados. El Ministerio conserva las dos bases, pero las cruza a posteriori, y por eso los fraudes se detectan años después.

- **Tiempo:** entre días y semanas por candidato, según la respuesta de cada institución. Se multiplica por el volumen de contrataciones públicas.
- **Esfuerzo:** personal dedicado a enviar solicitudes, hacer seguimiento y conciliar respuestas de fuentes distintas, sin un formato común.
- **Dinero:** costos de certificados en algunas universidades, horas-persona administrativas y, cuando el fraude aparece tarde, procesos disciplinarios o judiciales, contratos que deben anularse y salarios pagados sin sustento.
- **Reputación:** la universidad y la entidad contratante quedan expuestas cuando el caso se hace público.

## Hipótesis blockchain

> Tu teoría de cómo blockchain podría ayudar, apoyada en al menos un criterio de la Sesión 1:
> registro compartido entre partes que desconfían, historial inmutable, o eliminación de intermediarios que concentran la confianza.

Mi teoría es que un registro compartido entre la universidad, el ICFES y el Ministerio permitiría validar el título completo en el momento en que se emite, y no años después. Cuando el graduado cumple ambas condiciones, cada institución firma su parte: la universidad registra el grado y el ICFES registra la presentación del Saber Pro. Un contrato inteligente solo marca el título como válido si las dos firmas existen. Si alguna de las dos falta o se anula después, el estado del título cambia para todos. Así, la validez deja de depender de cruces manuales entre bases separadas y pasa a quedar en una regla verificable por cualquiera. El empleador verifica con un QR. En la cadena solo van hashes y fechas; el puntaje del examen no se guarda.

Cumple varios de los criterios: 
- Emiten dos instituciones independientes (universidad e ICFES), más el Ministerio, y ninguna debería ser la dueña del registro de las otras. Hoy son dos bases separadas que se cruzan años después.
- El empleador verifica sin llamar a la universidad ni al ICFES. 
- Una anulación se ve para todos al instante. Ante "bastaría una API del Ministerio": el Ministerio ya tenía las dos bases y detectó los casos años después. Aquí la regla se aplica en el momento de emitir, y verificar no depende de que un sistema del Estado esté disponible ni de pedirle permiso a nadie.
