
# Adicionar Biblioteca de Referências ao Trial do Arcano Cloner

## O que muda

Atualmente, o trial do Arcano Cloner só permite enviar uma foto de referência pelo upload direto (input file). O objetivo é adicionar o mesmo sistema de biblioteca de fotos de referência (PhotoLibraryModal) que existe na ferramenta principal, permitindo que o visitante escolha uma referência profissional da biblioteca.

## Arquivos modificados

### 1. `src/components/arcano-cloner/trial/ClonerTrialMockup.tsx`
- Adicionar prop `onOpenLibrary` na interface
- Na area de referência (linhas 173-193), substituir o card simples por algo que permita tanto upload quanto o botão "Escolher da biblioteca"
- Quando já tem referência selecionada, mostrar botão "Trocar Imagem" que abre a biblioteca (mesmo padrão do ReferenceImageCard da tool principal)

### 2. `src/components/arcano-cloner/trial/ClonerTrialSection.tsx`
- Importar `PhotoLibraryModal`
- Adicionar estado `showPhotoLibrary` (boolean)
- Criar handler `handleSelectFromLibrary`: recebe a URL da foto, faz fetch para converter em File, depois chama `processFile(file, 'reference')`
- Criar handler `handleUploadFromModal`: recebe dataUrl + File, seta referenceImage e referenceFile
- Passar `onOpenLibrary={() => setShowPhotoLibrary(true)}` para o ClonerTrialMockup
- Renderizar `<PhotoLibraryModal>` no JSX com os handlers

## Fluxo do usuario

```text
Area de Referência no Trial
  -> Clica no card vazio
  -> Abre PhotoLibraryModal (mesma da tool principal)
  -> Pode escolher da biblioteca OU fazer upload pelo modal
  -> Imagem selecionada aparece no card
  -> Botão "Trocar Imagem" abre o modal novamente
```

## Detalhes tecnicos

- O `PhotoLibraryModal` ja esta pronto e reutilizavel -- aceita `onSelectPhoto(url)` e `onUploadPhoto(dataUrl, file)`
- Para fotos da biblioteca (URL), sera necessario fazer fetch da URL e converter em File para manter compatibilidade com o fluxo de upload do trial (que envia File para o bucket)
- O mesmo componente e usado no Arcano Cloner, Veste AI e Pose Changer, entao nao precisa de nenhuma alteracao no modal em si
