/**
 * Dicionário de sinônimos PT-BR para busca inteligente.
 * Cada grupo contém palavras intercambiáveis — se o usuário digitar qualquer
 * uma delas, a busca expande para todas as outras do grupo.
 */

/**
 * Remove diacritics/accents from a string.
 * "ração" -> "racao", "música" -> "musica", etc.
 */
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const SYNONYM_GROUPS: string[][] = [
  // Gênero / Pessoas
  ["homem", "rapaz", "garoto", "masculino", "cara", "boy", "menino", "jovem homem", "senhor", "macho"],
  ["mulher", "garota", "moça", "feminino", "girl", "menina", "senhora", "dama", "lady"],
  ["casal", "couple", "dupla", "par", "namorados", "juntos"],
  ["criança", "kid", "infantil", "bebê", "baby", "neném", "child"],
  ["idoso", "velho", "ancião", "terceira idade", "elderly"],

  // Eventos
  ["festa", "balada", "party", "evento", "celebração", "comemoração", "night", "noite"],
  ["casamento", "noiva", "noivo", "wedding", "matrimônio", "bodas", "cerimônia"],
  ["aniversário", "birthday", "niver", "parabéns"],
  ["formatura", "graduation", "colação", "diploma"],
  ["churrasco", "bbq", "barbecue", "churras"],
  ["natal", "christmas", "natalino", "xmas"],
  ["halloween", "dia das bruxas", "fantasia terror"],
  ["carnaval", "carnival", "folia", "bloco"],
  ["réveillon", "ano novo", "new year", "virada"],
  ["show", "concert", "concerto", "espetáculo", "apresentação", "live", "gig"],

  // Roupas / Moda
  ["roupa", "vestimenta", "traje", "outfit", "look", "vestuário"],
  ["terno", "suit", "blazer", "paletó", "costume"],
  ["vestido", "dress", "longo", "curto"],
  ["camiseta", "camisa", "t-shirt", "blusa", "top"],
  ["calça", "pants", "jeans", "calça jeans", "bermuda", "shorts"],
  ["saia", "skirt", "minissaia"],
  ["sapato", "shoe", "tênis", "sneaker", "bota", "sandália", "chinelo"],
  ["boné", "cap", "chapéu", "hat", "gorro", "touca"],
  ["óculos", "glasses", "sunglasses", "óculos de sol"],
  ["relógio", "watch", "acessório"],
  ["jaqueta", "jacket", "casaco", "moletom", "hoodie", "agasalho", "blusa de frio"],
  ["biquíni", "bikini", "maiô", "moda praia", "beachwear"],
  ["lingerie", "underwear", "roupa íntima", "calcinha", "sutiã"],

  // Estilo / Aparência
  ["elegante", "sofisticado", "chique", "luxuoso", "classy", "fino", "requintado"],
  ["casual", "despojado", "informal", "relaxado", "descontraído"],
  ["sexy", "sensual", "sedutor", "sedutora", "hot"],
  ["esportivo", "sport", "atlético", "fitness", "gym", "academia"],
  ["vintage", "retrô", "retro", "antigo", "old school"],
  ["moderno", "modern", "contemporâneo", "atual", "trendy"],
  ["streetwear", "urban", "urbano", "street"],
  ["gótico", "gothic", "dark", "sombrio"],
  ["punk", "rock", "rocker", "roqueiro"],
  ["romântico", "romantic", "delicado", "suave"],

  // Cores
  ["preto", "black", "escuro", "negro", "dark"],
  ["branco", "white", "claro", "alvo"],
  ["vermelho", "red", "rubro", "encarnado", "bordô"],
  ["azul", "blue", "celeste", "marinho", "navy"],
  ["verde", "green", "esmeralda"],
  ["amarelo", "yellow", "dourado", "gold", "ouro"],
  ["rosa", "pink", "rosado", "magenta"],
  ["roxo", "purple", "violeta", "lilás", "lavanda"],
  ["laranja", "orange"],
  ["cinza", "gray", "grey", "prata", "silver"],
  ["marrom", "brown", "bege", "caramelo", "café"],

  // Cenários / Locais
  ["praia", "beach", "litoral", "mar", "oceano", "costa"],
  ["cidade", "city", "urbano", "metrópole", "downtown"],
  ["campo", "rural", "fazenda", "sítio", "natureza", "nature"],
  ["montanha", "mountain", "serra", "morro"],
  ["floresta", "forest", "mata", "bosque", "jungle", "selva"],
  ["estúdio", "studio", "fundo neutro", "backdrop"],
  ["rua", "street", "avenida", "calçada"],
  ["bar", "pub", "lounge", "nightclub", "boate", "club"],
  ["restaurante", "restaurant", "café", "cafeteria"],
  ["igreja", "church", "templo", "chapel", "capela"],
  ["piscina", "pool", "swimming"],
  ["jardim", "garden", "parque", "park"],
  ["escritório", "office", "corporativo", "trabalho"],
  ["casa", "home", "lar", "residência", "apartamento"],

  // Poses / Ações
  ["sentado", "sitting", "sentada"],
  ["em pé", "standing", "de pé"],
  ["deitado", "lying", "deitada", "reclinado"],
  ["andando", "walking", "caminhando"],
  ["correndo", "running", "jogging"],
  ["dançando", "dancing", "dança"],
  ["sorrindo", "smiling", "sorriso", "feliz", "happy"],
  ["sério", "serious", "pensativo", "contemplativo"],
  ["olhando", "looking", "encarando", "fitando"],

  // Iluminação / Fotografia
  ["noturno", "night", "noite", "escuro", "nocturnal"],
  ["diurno", "day", "dia", "daylight", "luz do dia"],
  ["pôr do sol", "sunset", "golden hour", "entardecer", "crepúsculo"],
  ["neon", "neons", "luz neon", "colorido"],
  ["contraluz", "backlight", "silhueta", "silhouette"],

  // Cabelo
  ["cabelo", "hair", "penteado", "corte"],
  ["loiro", "loira", "blonde", "dourado"],
  ["moreno", "morena", "brunette", "castanho"],
  ["ruivo", "ruiva", "redhead", "ginger"],
  ["careca", "bald", "raspado"],
  ["barba", "beard", "barbado"],
  ["bigode", "mustache", "moustache"],

  // Tatuagem / Body
  ["tatuagem", "tattoo", "tatuado", "tatuada", "tattooed"],
  ["musculoso", "muscular", "forte", "definido", "bodybuilder"],
  ["magro", "slim", "thin", "esbelto", "esguio"],
  ["gordo", "fat", "plus size", "gordinho", "cheio"],

  // Música (contexto do app)
  ["cantor", "singer", "vocalista", "vocalist"],
  ["rapper", "rap", "mc", "hip hop", "hiphop"],
  ["dj", "disc jockey", "produtor", "producer"],
  ["guitarrista", "guitar", "guitarra", "violão"],
  ["baterista", "drummer", "bateria", "drums"],
  ["funk", "funkeiro", "mc funk", "baile funk"],
  ["sertanejo", "country", "sertaneja"],
  ["pagode", "samba", "pagodeiro", "sambista"],
  ["trap", "drill", "phonk"],
  ["rock", "metal", "heavy metal", "hardcore"],
  ["pop", "popstar", "mainstream"],
  ["gospel", "religioso", "cristão", "worship"],
  ["reggae", "reggaeton", "rastafari", "rasta"],

  // Objetos
  ["carro", "car", "automóvel", "veículo", "auto"],
  ["moto", "motorcycle", "motocicleta", "bike"],
  ["celular", "phone", "smartphone", "telefone"],
  ["microfone", "mic", "microphone"],
  ["dinheiro", "money", "cash", "grana", "nota"],
  ["arma", "gun", "pistola", "weapon"],
  ["corrente", "chain", "colar", "necklace", "cordão"],
  ["anel", "ring", "aliança"],

  // Expressões / Vibe
  ["luxo", "luxury", "rico", "ostentação", "glamour", "premium"],
  ["simples", "simple", "minimalista", "clean", "básico"],
  ["artístico", "art", "arte", "artistic", "criativo", "creative"],
  ["profissional", "professional", "corporativo", "business", "executivo"],
  ["engraçado", "funny", "humor", "comédia", "divertido"],
  ["triste", "sad", "melancólico", "solitário"],
  ["raiva", "anger", "angry", "bravo", "furioso"],
  ["misterioso", "mysterious", "enigmático", "sombrio"],

  // Flyer-specific
  ["flyer", "panfleto", "cartaz", "banner", "poster"],
  ["convite", "invitation", "invite", "convite digital"],
  ["promoção", "promo", "oferta", "desconto", "sale"],
  ["abertura", "inauguração", "opening", "grand opening", "estreia"],
  ["lineup", "atração", "artista", "line up", "programação"],
];

// Build a lookup map: word -> Set of all synonyms (including itself)
// Keys are stored BOTH with accents and without for accent-insensitive lookup
const synonymMap = new Map<string, Set<string>>();

for (const group of SYNONYM_GROUPS) {
  const normalizedGroup = group.map(w => w.toLowerCase().trim());
  const groupSet = new Set(normalizedGroup);
  
  // Also add accent-stripped versions to the group
  for (const w of normalizedGroup) {
    const stripped = removeAccents(w);
    if (stripped !== w) groupSet.add(stripped);
  }
  
  // Map both accented and unaccented keys to the same group
  for (const word of Array.from(groupSet)) {
    const variants = [word, removeAccents(word)];
    for (const variant of variants) {
      if (synonymMap.has(variant)) {
        const existing = synonymMap.get(variant)!;
        for (const w of groupSet) existing.add(w);
        for (const w of existing) synonymMap.set(w, existing);
      } else {
        synonymMap.set(variant, groupSet);
      }
    }
  }
}

/**
 * Given a single word, returns all its synonyms (including itself).
 */
export function getSynonyms(word: string): string[] {
  const normalized = word.toLowerCase().trim();
  if (!normalized) return [];
  const group = synonymMap.get(normalized);
  return group ? Array.from(group) : [normalized];
}

/**
 * Given a search string (possibly multiple words), expands each word
 * with its synonyms and returns a flat deduplicated list.
 */
export function expandSearchTerms(search: string): string[] {
  const words = search
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(w => w.length >= 2);

  if (words.length === 0) return [];

  const allTerms = new Set<string>();

  for (const word of words) {
    for (const synonym of getSynonyms(word)) {
      allTerms.add(synonym);
    }
  }

  return Array.from(allTerms);
}
