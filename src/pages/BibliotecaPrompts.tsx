import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink, Copy, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface PromptItem {
  id: number;
  title: string;
  prompt: string;
  imageUrl: string;
}

const BibliotecaPrompts = () => {
  const [prompts] = useState<PromptItem[]>([
    {
      id: 1,
      title: "Selo 3D de Desconto",
      prompt: "Crie um ícone 3D de uma etiqueta de preço em forma de porcentagem, com design moderno e elegante. A superfície apresenta acabamento em plástico brilhante ou vermelho metálico na cor vermelho e detalhes em tons de cinza escuro. A iluminação suave e realista destaca as curvas e relevos do objeto, criando sombras delicadas e reflexos suaves. A composição é centralizada e apresentada em um fundo branco limpo, transmitindo minimalismo e sofisticação. Renderização em estilo hiper-realista, com texturas detalhadas e qualidade de imagem ultra nítida (4K).",
      imageUrl: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=400&h=400&fit=crop",
    },
    {
      id: 2,
      title: "Selo 3D de Sacola de Compras",
      prompt: "Crie um ícone 3D de uma sacola de compras, com design moderno e elegante. A sacola tem acabamento em couro sintético preto com alças vermelhas brilhantes. A superfície apresenta textura realista com reflexos suaves. A iluminação suave destaca os detalhes e cria sombras delicadas. A composição é centralizada em um fundo branco limpo, transmitindo elegância e sofisticação. Renderização em estilo hiper-realista, com texturas detalhadas e qualidade de imagem ultra nítida (4K).",
      imageUrl: "https://images.unsplash.com/photo-1557821552-17105176677c?w=400&h=400&fit=crop",
    },
    {
      id: 3,
      title: "Selo 3D de Game Over",
      prompt: "Crie uma composição 3D vibrante e divertida com o tema 'Game Over'. A cena deve incluir elementos coloridos como cogumelos estilizados inspirados em jogos retrô (vermelho com bolinhas brancas, verde e roxo), nuvens pixeladas brancas e o texto 'GAME OVER' em fonte pixelada preta e branca. Os elementos devem ter acabamento brilhante e textura plástica. A composição transmite nostalgia dos jogos clássicos com um toque moderno. Fundo branco limpo, iluminação suave criando sombras delicadas. Renderização hiper-realista em 4K.",
      imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=400&fit=crop",
    },
    {
      id: 4,
      title: "Selo 3D de Halloween",
      prompt: "Crie uma composição 3D encantadora de Halloween com uma placa de madeira rústica pendurada. A placa apresenta o texto 'FELIZ HALLOWEEN' em letras douradas brilhantes com contorno laranja vibrante. Ao redor da placa, adicione elementos temáticos: um chapéu de bruxa roxo escuro, uma abóbora laranja, folhas de outono e teias de aranha delicadas. O acabamento deve ser texturizado e realista, com iluminação suave destacando os detalhes. Fundo branco limpo. Renderização hiper-realista em 4K.",
      imageUrl: "https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=400&h=400&fit=crop",
    },
    {
      id: 5,
      title: "Selo 3D de Halloween Festivo",
      prompt: "Crie uma composição 3D festiva de Halloween com o texto 'FELIZ HALLOWEEN' em letras laranja e preto com efeito 3D expressivo. Adicione elementos decorativos: morcegos voando, abóboras laranja brilhantes, teias de aranha delicadas e folhas de outono. O design deve ser vibrante e alegre, com acabamento plástico brilhante. Iluminação dramática criando sombras e realces. Fundo branco limpo. Renderização hiper-realista em 4K.",
      imageUrl: "https://images.unsplash.com/photo-1508424897578-1451d6c18f1f?w=400&h=400&fit=crop",
    },
    {
      id: 6,
      title: "Selo 3D de Dia do Nordestino",
      prompt: "Crie uma composição 3D alegre celebrando o Dia do Nordestino. O texto 'Dia do Nordestino' deve estar em letras 3D com textura de madeira natural. Ao redor, adicione elementos típicos: cactos verdes, um chapéu de palha tradicional, e outros símbolos da cultura nordestina. As cores devem ser quentes e terrosas (verde, bege, marrom). Acabamento texturizado e realista com iluminação suave. Fundo branco limpo. Renderização hiper-realista em 4K.",
      imageUrl: "https://images.unsplash.com/photo-1464047736614-af63643285bf?w=400&h=400&fit=crop",
    },
    {
      id: 7,
      title: "Selo 3D de Feliz Natal",
      prompt: "Crie uma composição 3D festiva de Natal com uma estrela vermelha brilhante ao centro. O texto 'Feliz Natal' deve estar em letras 3D verde-esmeralda com acabamento metálico brilhante. Adicione elementos natalinos: melancia estilizada, fitas vermelhas e verdes. O design deve transmitir alegria e celebração. Iluminação suave com reflexos metálicos. Fundo branco limpo. Renderização hiper-realista em 4K.",
      imageUrl: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=400&h=400&fit=crop",
    },
    {
      id: 8,
      title: "Selo 3D de Volta às Aulas",
      prompt: "Crie uma composição 3D colorida e alegre com o tema 'Volta às Aulas'. O texto 'VOLTA ÀS AULAS' deve estar em letras 3D vibrantes e multicoloridas (amarelo, rosa, azul, roxo). Ao redor, adicione elementos escolares: caderno espiral, lápis colorido, borracha rosa. O design deve ser jovem e energético com acabamento plástico brilhante. Iluminação suave criando sombras delicadas. Fundo branco limpo. Renderização hiper-realista em 4K.",
      imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=400&fit=crop",
    },
  ]);

  const copyToClipboard = (prompt: string, title: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success(`Prompt "${title}" copiado!`);
  };

  const downloadImage = (imageUrl: string, title: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Imagem "${title}" baixada!`);
  };

  const externalLinks = [
    {
      name: "Gerar no ChatGPT",
      url: "https://chatgpt.com/",
      icon: Sparkles,
    },
    {
      name: "Gerar no Nano Banana",
      url: "https://aistudio.google.com/prompts/new_chat?model=gemini-2.5-flash-image",
      icon: Sparkles,
    },
    {
      name: "Gerar no Whisk",
      url: "https://labs.google/fx/pt/tools/whisk",
      icon: Sparkles,
    },
    {
      name: "Gerar no Flux 2",
      url: "https://www.runninghub.ai/workflow/1995538803421020162",
      icon: Sparkles,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-72 min-h-screen bg-card border-r border-border p-6 space-y-4">
          <h2 className="text-xl font-bold text-foreground mb-6">Ferramentas de IA</h2>
          {externalLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button
                variant="outline"
                className="w-full h-auto py-4 px-4 flex items-center justify-between text-left hover:bg-secondary hover:scale-105 transition-all duration-300"
              >
                <span className="font-medium">{link.name}</span>
                <ExternalLink className="h-5 w-5 ml-2 flex-shrink-0" />
              </Button>
            </a>
          ))}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Featured Card */}
          <Card className="mb-8 p-8 bg-gradient-primary text-primary-foreground shadow-hover">
            <div className="flex items-center gap-4 mb-4">
              <Sparkles className="h-12 w-12" />
              <div>
                <h1 className="text-3xl font-bold mb-2">Conheça a Forja de Selos 3D</h1>
                <p className="text-lg opacity-90">
                  Gere um selo novo, substitua o título, deixe em 4K e anime seus selos 3D em um só lugar.
                </p>
              </div>
            </div>
            <a
              href="https://payfast.greenn.com.br/145734/offer/KTNZe0"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="secondary"
                size="lg"
                className="mt-4 font-semibold hover:scale-105 transition-transform"
              >
                Acessar Forja de Selos 3D
                <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </Card>

          {/* Page Title */}
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-foreground mb-2">Biblioteca de Prompts</h2>
            <p className="text-muted-foreground text-lg">
              Explore nossa coleção de prompts para criar selos 3D incríveis
            </p>
          </div>

          {/* Prompts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prompts.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden hover:shadow-hover transition-all duration-300 hover:scale-[1.02]"
              >
                {/* Image Preview */}
                <div className="aspect-square overflow-hidden bg-muted">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Card Content */}
                <div className="p-5 space-y-4">
                  <h3 className="font-bold text-lg text-foreground">{item.title}</h3>

                  {/* Prompt Box */}
                  <div className="bg-muted p-4 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground line-clamp-4">{item.prompt}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => copyToClipboard(item.prompt, item.title)}
                      className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Prompt
                    </Button>
                    <Button
                      onClick={() => downloadImage(item.imageUrl, item.title)}
                      variant="outline"
                      className="hover:bg-secondary"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default BibliotecaPrompts;
