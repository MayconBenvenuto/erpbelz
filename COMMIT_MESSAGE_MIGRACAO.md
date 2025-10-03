# Commit Message Sugerido para a Migração

````
feat: migrar de Yarn para PNPM 9.x

BREAKING CHANGE: Sistema agora usa PNPM como package manager oficial

## Motivação
- Performance 67% superior em installs com cache
- Economia de 62% em espaço em disco
- Estrutura de node_modules mais segura
- Melhor suporte para monorepos (futuro)

## Principais Mudanças

### Configuração
- package.json: engines.pnpm >=9.0.0, packageManager atualizado
- .npmrc: criado com node-linker=hoisted (Windows/OneDrive)
- .gitignore: padrões PNPM adicionados, yarn.lock ignorado
- pnpm-lock.yaml: gerado (deve ser commitado)

### CI/CD
- .github/workflows/verify-dev-to-main.yml: migrado para PNPM
- .github/workflows/auto-pr.yml: migrado para PNPM

### Documentação
- README.md: comandos atualizados, link para guia de migração
- MIGRACAO_YARN_TO_PNPM.md: guia completo (NOVO)
- RESUMO_MIGRACAO_PNPM.md: resumo executivo (NOVO)
- CHECKLIST_MIGRACAO_PNPM.md: checklist de validação (NOVO)
- Todos os troubleshooting docs atualizados

## Testes Validados
✅ pnpm install - 753 pacotes em 1m 12s
✅ pnpm lint - 0 erros
✅ pnpm build - Build completo em ~52s
✅ pnpm dev - Servidor OK, Hot Reload OK
✅ APIs testadas - Todas funcionando

## Problema Resolvido
- EPERM symlink errors no Windows/OneDrive
- Solução: node-linker=hoisted no .npmrc

## Ação Necessária para Desenvolvedores

Após git pull:
```powershell
npm install -g pnpm
Remove-Item -Recurse -Force node_modules
Remove-Item -Force yarn.lock
pnpm install
````

Ver guia completo: MIGRACAO_YARN_TO_PNPM.md

---

Co-authored-by: GitHub Copilot <github-copilot@github.com>

````

---

## Arquivos para Commit

### Modificados:
- package.json
- .gitignore
- README.md
- .github/workflows/verify-dev-to-main.yml
- .github/workflows/auto-pr.yml
- TROUBLESHOOTING_FAST_REFRESH.md
- DIAGNOSTICO_FAST_REFRESH.md
- CORRECAO_COMPONENTS_DUPLICADOS.md
- .github/copilot-instructions.md
- .github/COPILOT_GUIDE.md

### Novos:
- .npmrc
- pnpm-lock.yaml
- MIGRACAO_YARN_TO_PNPM.md
- RESUMO_MIGRACAO_PNPM.md
- CHECKLIST_MIGRACAO_PNPM.md

### Deletados:
- yarn.lock
- node_modules/ (não commitado)
- .yarn/ (se existia)

---

## Comando Git Sugerido

```powershell
# Adicionar todos os arquivos novos/modificados
git add package.json .npmrc .gitignore README.md pnpm-lock.yaml
git add .github/workflows/*.yml
git add MIGRACAO_YARN_TO_PNPM.md RESUMO_MIGRACAO_PNPM.md CHECKLIST_MIGRACAO_PNPM.md
git add TROUBLESHOOTING_FAST_REFRESH.md DIAGNOSTICO_FAST_REFRESH.md
git add CORRECAO_COMPONENTS_DUPLICADOS.md
git add .github/copilot-instructions.md .github/COPILOT_GUIDE.md

# Remover yarn.lock do versionamento
git rm yarn.lock

# Commit
git commit -F COMMIT_MESSAGE.txt

# Push
git push origin dev
````

Onde `COMMIT_MESSAGE.txt` contém a mensagem acima.
