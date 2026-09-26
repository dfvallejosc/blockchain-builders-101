# Propuesta individual — Diego Vallejos

**Idea: HabilitApp**

## El problema

Los coordinadores de seguridad y salud en el trabajo de las obras de construcción no pueden comprobar que el concepto médico y los certificados de sus trabajadores para tareas de alto riesgo no hayan sido falsificados o alterados, ni que los haya emitido una entidad autorizada, porque los reciben como PDF o papel de consultorios y centros de entrenamiento pequeños que no tienen cómo respaldarlos.

## Quién sufre

- **Los coordinadores de seguridad y salud en el trabajo y las constructoras.** Revisan los documentos de cuadrillas que cambian con frecuencia, con certificados de muchos emisores distintos. Si ocurre un accidente y un trabajador no tiene su certificado al día, el empleador o contratante puede ser considerado responsable.
- **Los consultorios de salud ocupacional y los centros de entrenamiento pequeños.** Emiten certificados legítimos, pero no tienen la tecnología ni la confianza para demostrar que lo son: su documento no se distingue de uno falso.
- **Los trabajadores.** Hacen tareas de alto riesgo, y si el control falla, quedan expuestos a un accidente sin la aptitud o la capacitación que se supone que tienen.

El contexto es la construcción en Colombia: en 2025 hubo 534.444 accidentes de trabajo y 61 muertes en el sector, el 13,9% del total (Consejo Colombiano de Seguridad). Además, hay certificados falsos de trabajo en alturas en circulación a nombre del Ministerio del Trabajo, con cobros de entre $350.000 y $800.000 (El País).

## Resolución actual y costos

**Cómo se resuelve hoy.** El trabajador obtiene su concepto médico o certificado del emisor, como PDF o papel, y se lo entrega a su subcontratista. El subcontratista envía la carpeta de la cuadrilla al coordinador, que revisa a mano las fechas y vigencias y, cuando puede, intenta confirmar con el emisor por teléfono o en su página, si la tiene. Después autoriza el ingreso o firma el permiso de la tarea.

**Costos.**
- **Tiempo y esfuerzo:** la revisión es manual, documento por documento, para cada trabajador y cada vez que cambia la cuadrilla. Confirmar con el emisor depende de que este conteste o tenga página. No tenemos una medición del tiempo.
- **Dinero:** no hay un costo directo por revisar, pero el riesgo de fondo es económico y legal: si ocurre un accidente sin certificado al día, la constructora puede responder por él.
- **Confianza:** en ningún punto se puede comprobar que el documento no se haya falsificado o alterado en el camino, y los emisores pequeños no pueden demostrar que sus certificados son reales.

## Hipótesis blockchain

Creo que si cada emisor firma sus certificados y su huella queda registrada en blockchain, el coordinador podrá comprobar en segundos, escaneando un QR, que un certificado no fue alterado, está vigente y viene de un emisor autorizado. El emisor pequeño, por su parte, podrá demostrar que sus certificados son reales.

Me apoyo en tres criterios de la Sesión 1:
- **Registro compartido entre partes que desconfían.** Los emisores son consultorios y centros independientes, y ninguno aceptaría que otro fuera dueño del registro. El coordinador tampoco tendría por qué confiar en ese dueño.
- **Historial inmutable.** Hay motivos para cambiar una fecha de vigencia o fabricar un certificado con fecha anterior, por ejemplo después de un accidente. En un registro distribuido, cualquier cambio queda visible.
- **Sin intermediarios que concentren la confianza.** Una base de datos de la constructora solo sirve en sus obras, y una plataforma central tiene un dueño en quien todos tendrían que confiar.
