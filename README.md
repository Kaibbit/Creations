# Jornada Bíblica

Plataforma de estudo bíblico guiado, construída com Next.js e Supabase.

## Estado atual

- Evangelho de Marcos completo (16 capítulos)
- Cadastro, login, logout e recuperação de senha
- Progresso de leitura e estudo por usuário
- Respostas por seção: observação, interpretação, conexão, aplicação e conclusão
- Caderno com conclusões e anotações
- Supabase com RLS para separar os dados privados de cada usuário

## Desenvolvimento local

```bash
npm install
npm run dev
```

O front utiliza a chave publicável do Supabase. Chaves privadas/service-role nunca devem ser colocadas no navegador ou neste repositório.
