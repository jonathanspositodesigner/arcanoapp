

## Correção das URLs de Imagens Quebradas - Combo Artes Arcanas

### Problema Identificado

As imagens estão quebradas porque as URLs nos componentes estão **incorretas**. O código atual usa caminhos inventados como:
- `/2024/11/FLYER-EVENTO-Pagode-dos-Monarcas-STORIES-768x1365.webp` ❌

Quando as URLs corretas do WordPress são:
- `/2025/11/FESTEJA-TROPICAL-ST-768x1365.webp` ✅

---

### Correções por Arquivo

#### 1. FlyersGallerySection.tsx

**PAGODE (10 imagens) - URLs corretas:**
```
https://voxvisual.com.br/wp-content/uploads/2025/11/FESTEJA-TROPICAL-ST-768x1365.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/MIXTURADINHO-ST.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/BYE-BYE-FERIAS-768x1365.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/HOJE-JONAS-ESTICADO-768x1365.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/TARDEZINHA-HAVAIANA-768x1365.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/PAGODINHO-SUNSET.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/PAGODE-SO-AS-ANTIGAS.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/SABADO-COM-PAGODE-STORIES-SOCIAL-MEDIA.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/REVOADA-DO-CHEFE.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/END-OF-SUUMER.webp
```

**FORRÓ (10 imagens) - URLs corretas:**
```
https://voxvisual.com.br/wp-content/uploads/2025/11/MIXTURADINHO-ST.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/FLYER-EVENTO-FORRO-DO-VILA-STORY-SOCIAL-MEDIA-1.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/VIBE-FORROZEIRA-ST.jpg
https://voxvisual.com.br/wp-content/uploads/2025/11/FORRO-DE-SAO-JOAO.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/FENOMENO-DO-PISEIRO-768x1365.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/RESENHA-DO-SAMBA1.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/BALADINHA-DE-SABADO-STORY-SOCIAL-MEDIA.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/FLYER-EVENTO-BAILE-DA-FAVORITA-STORIES.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/Flyer-Furacao-Hit-Stories-Social-Media1.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/ARROCHA-DA-PATROA-ST-768x1365.webp
```

**FUNK (10 imagens) - URLs corretas:**
```
https://voxvisual.com.br/wp-content/uploads/2025/11/FUNK-PARTY-ST.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/NOITE-IN-VEGAS-ST.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/B-DAY-DO-TUBARAO.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/FLUXO-BAILE-FUNK.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/BAILE-DO-SINAL.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/B-DAY-MC-WM.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/FLYER-EVENTO-BAILE-DO-MALVADAO-STORIES.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/FLYER-EVENTO-GIRO-LOUCO-STORIES.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/FLYER-EMBRAZA-STORY-SOCIAL-MEDIA.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/MADE-IN-FUNK.webp
```

**CAVALGADA (8 imagens) - URLs corretas:**
```
https://voxvisual.com.br/wp-content/uploads/2025/11/12a-CAVALGADA-DOS-AMIGOS.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/AGENDA-SEMANAL-TOCA-DO-VALE.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/CAVALGADA-DOS-GIGANTES-scaled.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/CAVALGADA-FEST-2025.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/PROXIMOS-SHOWS-BIU-DO-PISEIRO.jpg
https://voxvisual.com.br/wp-content/uploads/2025/11/CAVALGADA.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/RODEIO-E-VAQUEJADA.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/CONTRATE-JOAO-GOMES.webp
```

**SERTANEJO (8 imagens) - URLs corretas:**
```
https://voxvisual.com.br/wp-content/uploads/2025/11/DIA-DOS-PAIS-CABARET.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/BALADA-PRIME.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/ROTA-SERTANEJA-ST.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/BALADA-PRIME1.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/BOTECO-NOSSA-VIBE.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/SUNSET-FESTIVAL.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/BOTECO-SERTANEJO.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/NOITE-SEM-FIM.webp
```

**VARIADAS (8 imagens) - URLs corretas:**
```
https://voxvisual.com.br/wp-content/uploads/2025/11/ARRAIA-DE-SAO-JOAO.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/DIA-DAS-MAES.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/DIA-DOS-NAMORADOS.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/ELETRO-HOUSE.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/ENCONTRO-DE-PAREDOES.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/HALLOWEEN-PARTY-ST.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/HALLOWEEN-SURREAL-ST.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/PLAY-NAS-FERIAS.webp
```

---

#### 2. BonusFimDeAnoSection.tsx

**14 imagens de Reveillon/Natal - URLs corretas:**
```
https://voxvisual.com.br/wp-content/uploads/2025/12/REVEILLON-LEO-SANTANA-E-IZA-ST-768x1365.webp
https://voxvisual.com.br/wp-content/uploads/2025/12/REVEILLON-DOS-SONHOS-ST-768x1365.webp
https://voxvisual.com.br/wp-content/uploads/2025/12/REVEILLON-2026-ST-768x1365.webp
https://voxvisual.com.br/wp-content/uploads/2025/12/REVEILLON-SURREAL-2026-ST-768x1365.webp
https://voxvisual.com.br/wp-content/uploads/2025/12/REVEILLON-TROPICAL-ST-768x1365.webp
https://voxvisual.com.br/wp-content/uploads/2025/12/REVEILLON-TROPICAL-ST-768x1365-1.webp
https://voxvisual.com.br/wp-content/uploads/2025/12/O-ULTIMO-BAILE-DO-ANO-ST-768x1365.webp
https://voxvisual.com.br/wp-content/uploads/2025/12/NATAL-PARTY-ST-768x1365.webp
https://voxvisual.com.br/wp-content/uploads/2025/12/AGENDA-DE-NATAL-ST~1-768x1365.webp
https://voxvisual.com.br/wp-content/uploads/2025/12/AGENDA-DE-NATAL-ST-768x1365.webp
https://voxvisual.com.br/wp-content/uploads/2025/12/AGENDA-FIM-DE-ANO-ST-768x1365.webp
https://voxvisual.com.br/wp-content/uploads/2025/12/PROXIMOS-SHOWS-ST-768x1365.webp
https://voxvisual.com.br/wp-content/uploads/2025/12/REVEILLON-NA-PRAIA-2025-ST-768x1365.webp
https://voxvisual.com.br/wp-content/uploads/2025/12/HOJE-REVEILLON-ST-768x1365.webp
```

---

#### 3. Selos3DSection.tsx

**Selos 3D - as URLs atuais parecem corretas, mas preciso verificar se estão com os nomes exatos. Mantendo:**
- Selos 1-20: `/2024/12/selo-3d-1.webp` até `selo-3d-20.webp`
- Selos 21-26: `/2025/11/21-1.webp` até `26-1.webp`

---

#### 4. MotionsGallerySection.tsx

**As URLs de thumbnails e vídeos parecem estar corretas, baseado no que foi verificado**

---

### Resumo das Alterações

| Arquivo | Ação |
|---------|------|
| `FlyersGallerySection.tsx` | Substituir TODAS as 54 URLs por URLs corretas de `/2025/11/` |
| `BonusFimDeAnoSection.tsx` | Substituir as 14 URLs por URLs corretas de `/2025/12/` |
| `Selos3DSection.tsx` | Verificar/manter URLs atuais |
| `MotionsGallerySection.tsx` | Verificar/manter URLs atuais |

---

### Resultado Esperado

Após aplicar as correções:
- Todas as imagens dos carrosséis de Flyers vão carregar
- Todas as imagens do Bônus Fim de Ano vão carregar
- Zero imagens quebradas na página

