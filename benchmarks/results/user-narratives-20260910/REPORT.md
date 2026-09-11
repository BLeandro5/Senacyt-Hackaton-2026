# Evaluación de diez relatos del usuario

Se ejecutó cada párrafo por separado mediante `extract_result`, con inferencia QVAC local real. Se conservaron la respuesta original del modelo y la extracción final. No se guardaron visitas ni activos. Una segunda pasada está en `../user-narratives-20260910-repeat`.

## Conteos: lectura manual frente a resultado

Los valores esperados son una interpretación explícita del texto, no inventario confirmado. Las cantidades reportadas, observadas, mínimas y potencialmente duplicadas deben mantenerse diferenciadas.

| Caso | Referencia del texto | Primera ejecución |
|---|---|---|
| 1. Central del Istmo | CT 2; MRI 2; ecógrafos 4; rayos X 1 reportado | CT 2; MRI 1; ecógrafos 4; rayos X 1 |
| 2. Santa María | CT 3 (2 observados); MRI 2; mamógrafos 2; ecógrafos 5 | Error 502 |
| 3. Centro Médico del Pacífico | CT 2; MRI 3; rayos X 5 (2 fijos, 3 móviles); ecógrafos al menos 6 (4 inspeccionados) | CT 3; MRI 5; rayos X 1; ecógrafos 1 |
| 4. Metropolitana Norte | MRI 2 observados frente a 1 histórico; CT 2; ecógrafos 5 con posible retiro; rayos X 3 | Error 502 |
| 5. San Lucas | MRI 2 (1 reportado); CT 2 más PET/CT 1; ecógrafos 2 observados, total desconocido; rayos X 1 | MRI 2; CT 2 sin distinguir PET/CT; ecógrafos 3; rayos X 1 |
| 6. Regional del Caribe | CT 4 (3 verificados); MRI 2; ecógrafos 7, riesgo de duplicación entre áreas | Error 502 |
| 7. Internacional del Sur | CT 2 observados con conflicto de marcas reportadas; MRI 2; ecógrafos 6 | CT 5; MRI 4; ecógrafos 4 |
| 8. San Rafael | CT 3 (1 no inspeccionado); MRI 2; ecógrafos 5 | Error 502 |
| 9. Nacional de Especialidades | MRI 3; CT 3; al menos 6 registros de ultrasonido, cantidad de activos únicos pendiente por posible doble conteo | MRI 5; CT 3; ecógrafos 1 |
| 10. Hospital de la Ciudad | CT 4; MRI 3; ecógrafos 8; mamógrafo 1; rayos X móviles de cantidad indeterminada | Error 502 |

Ningún caso obtuvo un resultado aceptable en la primera pasada: cinco errores de servicio y cinco extracciones con errores de conteo. Esto describe esta muestra, no una medida general de precisión del modelo.

## Hallazgos verificables

- La repetición de los errores 502 devuelve `Incomplete model output; shorten the observation`. El servicio tiene un presupuesto de generación de 256 tokens; este límite es un factor concreto a revisar para relatos largos.
- El caso 1 conserva solo un MRI. Convierte «siete u ocho años» en ocho y pierde las fallas de enfriamiento al dejar solo «Operativo». Además conserva «Istmo» como ciudad aunque el texto solo lo usa dentro del nombre del hospital.
- El caso 3 convierte «más de diez años» en diez exactos. Cuenta referencias descriptivas como equipos extra y pierde cantidades de rayos X y ultrasonido.
- El caso 5 pierde el intervalo de diez a doce años, no distingue PET/CT y convierte un total desconocido de ecógrafos en tres registros.
- El caso 7 asigna siete años al CT Siemens y nueve al MRI Siemens, aunque esas edades pertenecen a los otros equipos. Duplica referencias a los mismos dispositivos.
- El caso 9 pierde configuraciones 3T y 1.5T y la condición «apagado», y devuelve cinco resonadores en lugar de tres.
- La salida cruda y la final muestran fallos tanto del modelo como de las reglas posteriores. En el caso 7, el modelo devuelve dos CT y dos MRI, pero la salida final contiene cinco y cuatro respectivamente.

## Criterios para mejorar sin inventar información

- Conservar intervalos, alternativas y límites: «siete u ocho», «entre diez y doce», «más de diez», «menos de tres». No convertirlos en edades puntuales confirmadas.
- Conservar expresiones cualitativas como «más reciente», «varios años de uso» y «relativamente nuevo» con valor numérico desconocido.
- Diferenciar fecha de instalación, fecha de adquisición y duración de mantenimiento o inactividad.
- Conservar simultáneamente operación y fallas: un equipo puede funcionar con averías intermitentes.
- Separar observado, reportado, histórico, inaccesible y posible retiro. Los relatos contradictorios no implican sumar equipos.
- «Varios» no permite fijar una cantidad; «al menos seis» es un mínimo del reporte y no prueba seis activos únicos cuando se advierte doble conteo.
- Vincular «el segundo», «uno de los Siemens» y posteriores menciones de marca con los registros ya descritos.

Esta evaluación no modifica los pesos del modelo ni las reglas de producción. El script permite repetir los mismos casos después de cada mejora. No se evaluó en navegador ni el flujo posterior de preguntas de confirmación.
