# VISION.md — Regras de negócio

> Registro das regras de negócio **já definidas**. Nenhuma foi implementada na
> Sprint 0 — este documento é a fonte de verdade para as próximas Sprints.

## Contexto do produto

- Sistema **interno** da Outmat para gerar **propostas**.
- Não é SaaS. Uso via rede local e VPN.
- **Sem autenticação** na versão 1.0.
- Servidor Windows Server 2019; banco PostgreSQL.

## Entidades

- **Cliente**, **Produto**, **Vendedor** — cadastros base.
- **Proposta** — documento comercial. Pertence a um cliente (e opcionalmente a
  um vendedor).
- **Revisão** — cada proposta pode ter várias revisões (versões).
- **Seção** — agrupador de itens dentro de uma revisão.
- **Item** — item dentro de uma seção.
- **ConfiguracaoSistema** — registro único de configuração.

## Regra: hierarquia da proposta

```
Proposta → Revisão → Seção → Item
```

## Regra: Seção é um agrupador NEUTRO

- A Seção **não** representa obrigatoriamente um ambiente físico.
- É apenas um **agrupador de itens**.
- Exemplos válidos de nome de seção: "Sala", "Cozinha", "Casa 92",
  "Apartamento Flávio", "Área Externa", "Recepção", "Piso Superior".
- **Nunca** tratar Seção como "Ambiente" internamente (código, nomes, textos).

## Regra: modelos de proposta

Existem **exatamente dois** modelos:

### 1. COMERCIAL

- Sempre possui **Produtos + Serviços**.
- Pode possuir **módulos opcionais**. Inicialmente previstos:
  - **Projeto Wi-Fi**
  - **Projeto Som**
- A arquitetura deve permitir **adicionar novos módulos futuramente sem alterar
  a estrutura principal**.

### 2. SIMPLIFICADA

- Possui **apenas Produtos**.
- **Nunca** possui Serviços.
- **Nunca** possui módulos extras.

## Regra: configuração do sistema (singleton)

- Existe **apenas um** registro de configuração.
- Deve estar preparado para armazenar futuramente (sem mudança estrutural):
  dados da empresa, logo, endereço, telefones, WhatsApp, email, site, redes
  sociais, rodapé do PDF, textos institucionais, templates, caminhos de
  armazenamento e configurações gerais.

## Regra: armazenamento

- Todos os caminhos de arquivo são **configuráveis** (`.env`), nunca fixos.
- Compatível com Windows Server 2019.

## Formatações padrão (Brasil)

- **Moeda:** Real (R$) — `formatCurrency`.
- **Data:** `dd/mm/aaaa` — `formatDate`.
- **CPF/CNPJ:** `000.000.000-00` / `00.000.000/0000-00` — `formatCpfCnpj`.
- **Telefone:** `(00) 0000-0000` / `(00) 00000-0000` — `formatPhone`.
