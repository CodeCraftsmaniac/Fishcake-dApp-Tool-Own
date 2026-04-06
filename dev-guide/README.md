# 📋 Fishcake CLI Tool — Dev Guide

## What Is This Folder?

Everything a developer or AI model needs to build the **Fishcake CLI Tool** — a complete replica of fishcake.io as a terminal application.

---

## Files

| File | What It Is | When To Use |
|------|-----------|-------------|
| **`TASK_LIST.md`** | Complete task checklist with 10 phases, 35 tasks, 200+ subtasks. Includes tech stack, critical rules, file guide, and testing checklist — ALL MERGED into one file. | For human devs: follow tasks in order, check off as you go |
| **`PROMPT_AI.md`** | Self-contained prompt to copy-paste into an AI model (Opus/Codex/GPT). Contains ALL ABIs, addresses, features, rules, and instructions. The AI will build the entire tool without asking questions. | For AI-assisted builds: copy entire file → paste to AI → let it build |
| **`04_AI_MODEL_COMPARISON.md`** | Detailed comparison of AI models (Codex 5.3 Max, GPT 5.4, Sonnet 4.5, Opus 4.5) rated best to worst for this project. | When deciding which AI model to use |

---

## The Master Spec

📄 **`../FISHCAKE_CLI_TOOL_COMPLETE_ANALYSIS.md`** (~2,000 lines, 33 sections)

This is the **single source of truth** for all features, contract logic, ABIs, validation rules, and data flows. Every task in `TASK_LIST.md` references sections from this spec.

---

## How To Use

### For AI Builds:
1. Copy the entire `PROMPT_AI.md` → paste to Claude Opus 4.5 or Codex 5.3 Max
2. The AI will build all 27 source files without asking anything
3. Use `TASK_LIST.md` to verify nothing was missed

### For Human Devs:
1. Read `TASK_LIST.md` top-to-bottom
2. Follow the 10 phases in order
3. Reference `../FISHCAKE_CLI_TOOL_COMPLETE_ANALYSIS.md` for detailed logic
4. Check off tasks as you complete them
