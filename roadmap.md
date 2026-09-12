# Atualizações controladas pelo servidor

- [x] Publicar política de versão e bloquear Android abaixo da versão mínima no servidor existente.
- [x] Consultar ao abrir/retomar e receber a política nas respostas, sem intervalo de espera.
- [x] Permitir ignorar somente atualizações opcionais; manter as obrigatórias bloqueando o app.
- [x] Documentar configuração, limitações da instalação Android e publicação inicial.
- [x] Verificar testes, comportamento do aviso e erros existentes.

## Pendências fora do meu alcance
- Testes do servidor (`mvnw test`) não compilam por causa de arquivos antigos que citam
  `infra.email.EmailService`, classe que não existe no projeto. É anterior a este trabalho.
- Publicar a release `v2.0.100` no GitHub (o APK) depende do seu repositório.
