# WiLauncher

## Objetivo del proyecto

WiLauncher es una aplicación interna para el equipo de Operaciones de Wiloc cuyo objetivo es centralizar la gestión de infraestructura cloud desde una única interfaz web.

La aplicación permitirá visualizar y gestionar recursos desplegados en distintos proveedores cloud:

- AWS
- Microsoft Azure
- Google Cloud Platform (GCP)
- Oracle Cloud Infrastructure (OCI)

## Problema actual

Actualmente la gestión de servidores y máquinas virtuales se realiza desde diferentes consolas y herramientas dependiendo del proveedor cloud utilizado.

Esto provoca:

- Cambio constante entre plataformas.
- Diferencias de interfaz y experiencia de usuario.
- Mayor tiempo para realizar operaciones simples.
- Mayor riesgo de errores operativos.
- Dificultad para delegar tareas al equipo de operaciones.

## Objetivos funcionales

WiLauncher deberá permitir:

- Autenticación mediante cuenta corporativa Microsoft.
- Visualización del inventario de máquinas disponibles.
- Consulta del estado actual de cada máquina:
  - Running
  - Stopped
  - Starting
  - Stopping
  - Error
- Arranque de máquinas.
- Apagado de máquinas.
- Filtrado por:
  - Proveedor cloud
  - Entorno
  - Estado
- Registro de auditoría de todas las operaciones realizadas.

## Objetivos técnicos

La aplicación se construirá utilizando:

- Angular 22
- Firebase Authentication
- Firebase Hosting
- Firebase Functions para la integración con los proveedores cloud

## Arquitectura de alto nivel

```text
Usuario
   ↓
WiLauncher (Angular)
   ↓
Backend seguro
   ↓
AWS / Azure / GCP / OCI
```

El frontend nunca tendrá acceso directo a las credenciales de los proveedores cloud.

Todas las operaciones sensibles se ejecutarán desde un backend seguro utilizando identidades técnicas con permisos mínimos.

## Seguridad

Principios de diseño:

- Mínimo privilegio.
- Credenciales fuera del frontend.
- Auditoría completa de acciones.
- Confirmaciones adicionales para entornos productivos.
- Gestión de permisos por rol.

## Roles previstos

### Viewer

Puede consultar información.

### Operator

Puede arrancar y detener máquinas.

### Admin

Puede administrar configuraciones y permisos.

## Visión futura

En el futuro WiLauncher podrá incorporar:

- Gestión de costes cloud.
- Monitorización y alertas.
- Gestión de despliegues.
- Estado de servicios y aplicaciones.
- Gestión de contenedores y Kubernetes.
- Informes de utilización.
