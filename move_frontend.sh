#!/bin/bash

# Script para mover o conteúdo do diretório frontend/ para a raiz do projeto

set -e  # Exit on error

PROJECT_ROOT="/workspaces/continuum"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "Iniciando movimento de conteúdo de frontend/ para a raiz..."

# Verificar se o diretório frontend existe
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "Erro: Diretório $FRONTEND_DIR não encontrado!"
    exit 1
fi

# Mover todos os arquivos e diretórios do frontend para a raiz
echo "Movendo arquivos..."
cd "$FRONTEND_DIR"
for item in *; do
    if [ -e "$item" ]; then
        echo "  Movendo: $item"
        mv "$item" "$PROJECT_ROOT/"
    fi
done

# Mover arquivos ocultos também (.gitignore, .env, etc)
for item in .[^.]*; do
    if [ -e "$item" ] && [ "$item" != ".." ] && [ "$item" != "." ]; then
        echo "  Movendo: $item"
        mv "$item" "$PROJECT_ROOT/"
    fi
done

cd "$PROJECT_ROOT"

# Remover diretório frontend vazio
echo "Removendo diretório frontend vazio..."
rmdir "$FRONTEND_DIR"

echo "✓ Movimento completo! Conteúdo de frontend/ foi movido para a raiz."
echo "Estrutura atual em $PROJECT_ROOT:"
ls -la | head -20
