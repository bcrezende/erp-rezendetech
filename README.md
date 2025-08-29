# Sistema ERP Integrado com Chat IA

Sistema ERP completo com assistente de IA integrado para gestão financeira empresarial.

## 🚀 Funcionalidades

### 💼 Gestão Empresarial
- Dashboard com indicadores financeiros
- Gestão de pessoas (clientes, fornecedores, colaboradores)
- Catálogo de produtos e serviços
- Controle de vendas e compras
- Categorização para DRE

### 💰 Financeiro
- Contas a pagar e receber
- Transações financeiras
- DRE (Demonstrativo do Resultado do Exercício)
- Fluxo de caixa
- Indicadores financeiros

### 🤖 Chat IA Integrado
- Assistente inteligente para lançamentos financeiros
- Processamento de texto, áudio e imagem
- Consultas financeiras por voz ou texto
- Análise automática de notas fiscais
- Integração com OpenAI (Whisper, Vision, GPT)

## 📱 URLs de Acesso

### Sistema Principal
- **URL Principal**: `/` 
- **Descrição**: Interface completa do ERP

### Chat IA Standalone
- **URL do Chat**: `/chat.html`
- **Descrição**: Interface dedicada do chat IA
- **Uso**: Ideal para adicionar à tela inicial do celular
- **PWA**: Suporte completo para instalação como app

## 🛠️ Tecnologias

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase + Edge Functions
- **IA**: OpenAI (GPT, Whisper, Vision)
- **PWA**: Service Worker + Manifest
- **Autenticação**: Supabase Auth
- **Banco**: PostgreSQL (Supabase)

## 🔧 Configuração

1. Configure as variáveis de ambiente no Supabase
2. Adicione sua chave da OpenAI nas configurações
3. Deploy das Edge Functions
4. Configuração do RLS (Row Level Security)

## 📊 Agentes IA

### 🏦 Agente Financeiro
- Registra receitas e despesas
- Atualiza transações existentes
- Valida e categoriza lançamentos

### 📈 Agente de Consulta
- Consulta saldo e indicadores
- Gera relatórios DRE
- Analisa fluxo de caixa

### 🤔 Agente Indefinido
- Responde saudações
- Fornece ajuda e orientações
- Direciona para funcionalidades

## 🎯 Como Usar o Chat IA

### Por Texto
```
"Gastei R$ 150 com material de escritório"
"Qual meu saldo atual?"
"Contas a pagar hoje"
```

### Por Áudio
- Clique no microfone
- Fale sua solicitação
- O sistema transcreve e processa

### Por Imagem
- Envie foto de nota fiscal
- IA extrai dados automaticamente
- Confirma antes de registrar

## 📱 Instalação PWA

1. Acesse `/chat.html` no seu dispositivo
2. No navegador, toque em "Adicionar à tela inicial"
3. O chat ficará disponível como um app nativo
4. Acesso offline e notificações push

## 🔐 Segurança

- Row Level Security (RLS) em todas as tabelas
- Isolamento por empresa
- Autenticação obrigatória
- Validação de dados em todas as camadas