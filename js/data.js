/**
 * PROTA COMMUNITY — Dados de todos os produtos
 * Edite aqui para adicionar/remover produtos
 * O painel admin pode sobrescrever via localStorage
 */
var PROTA_DATA = {
  categorias: [
    { id: 'ia', nome: 'IA & Ferramentas', icon: 'cpu' },
    { id: 'nicho', nome: 'Nicho Hot & SMM', icon: 'flame' },
    { id: 'business', nome: 'Business & Marketing', icon: 'briefcase' },
    { id: 'design', nome: 'Design & Templates', icon: 'palette' },
    { id: 'videos', nome: 'Vídeos Lifestyle', icon: 'video' },
    { id: 'crm', nome: 'CRM & WhatsApp', icon: 'smartphone' },
    { id: 'educacao', nome: 'Educação & E-books', icon: 'book' },
    { id: 'outros', nome: 'Outros', icon: 'folder' }
  ],
  produtos: [
    // IA & Ferramentas
    { cat: 'ia', nome: 'AGENCIADOR', arquivo: 'files/AGENCIADOR.pdf', img: 'photos/photo_1@17-03-2026_21-17-23_thumb.jpg', desc: 'Ferramenta de agenciamento' },
    { cat: 'ia', nome: 'Gerador De Áudio Nicho Hot', arquivo: 'files/GERADOR DE ÁUDIO-NICHO HOT.pdf', img: '', desc: 'Gerador de áudio com IA' },
    { cat: 'ia', nome: 'InstaVoice', arquivo: 'files/InstaVoice.pdf', img: '', desc: 'Ferramenta de voz para Instagram' },
    // Nicho Hot & SMM
    { cat: 'nicho', nome: '15k Easy Caixa Rápido', arquivo: 'files/💎🤭NOVO_15k_EASY_CAIXA_RÁPIDO_SEM_IGAMING_E_SEM_HOT_MAR_AZUL🤭💎_Página.pdf', img: '', desc: 'Estratégia de caixa rápido' },
    { cat: 'nicho', nome: '3K Por Dia Nicho Hot + TikTok', arquivo: 'files/🔥COMO FAZER 3K POR DIA COM NICHO HOT + TIKTOK🔥.pdf', img: '', desc: 'Método completo nicho hot' },
    { cat: 'nicho', nome: 'SIGLAS DO IGAMING By Shadow', arquivo: 'files/SIGLAS DO IGAMING By Shadow.pdf', img: '', desc: 'Guia de siglas iGaming' },
    { cat: 'nicho', nome: 'Oportunidade Maior Onda Digital', arquivo: 'files/OPORTUNIDADE DA MAIOR ONDA DO DIGITAL!.pdf', img: '', desc: 'Oportunidades no digital' },
    { cat: 'nicho', nome: "O Que É SMM E Como Fazer Dinheiro", arquivo: "files/O'QUE É SMM E COMO FAZER DINHEIRO COM ISSO.pdf", img: '', desc: 'Guia completo SMM' },
    { cat: 'nicho', nome: 'Presente Para Painel', arquivo: 'files/PRESENTE PARA QUEM FIZER O PAINEL.pdf', img: '', desc: 'Bônus exclusivo' },
    { cat: 'nicho', nome: 'Saldo Free BlackGamingRaja', arquivo: 'files/SALDO FREE NA BLACKGAMINGRAJA.pdf', img: '', desc: 'Saldo grátis' },
    { cat: 'nicho', nome: 'Nicho Hot Twitter Orgânico', arquivo: 'files/NICHO_HOT_COMO_LUCRAR_COM_TWITTER_DE_FORMA_ORG_NICA_🔥_MENTORIA_Fada.pdf', img: '', desc: 'Mentoria Twitter orgânico' },
    { cat: 'nicho', nome: 'Operação SMM By Shadow', arquivo: 'files/OPERAÇÃO SMM - BY SHADOW.pdf', img: '', desc: 'Operação completa SMM' },
    { cat: 'nicho', nome: 'Caixa Rápido Com iGaming Pt.1', arquivo: 'files/CAIXA RÁPIDO COM IGAMING PT.1.pdf', img: '', desc: 'Caixa rápido iGaming' },
    { cat: 'nicho', nome: '6.448,71 Em 3 Dias ADS FREE', arquivo: 'files/COMO EU FIZ 6.448,71 EM 3 DIAS COM ADS FREE (1).pdf', img: '', desc: 'Estratégia ads free' },
    { cat: 'nicho', nome: 'Iniciar Nicho Hot Forma Certa', arquivo: 'files/COMO INICIAR NO NICHO HOT DA FORMA CERTA shadowtx.pdf', img: '', desc: 'Início no nicho hot' },
    { cat: 'nicho', nome: 'Levantar Caixa Rápido Sem Gastar', arquivo: 'files/COMO LEVANTAR CAIXA RAPIDO SEM GASTAR NADA! pt1.pdf', img: '', desc: 'Caixa sem investimento' },
    { cat: 'nicho', nome: 'Estratégia Caixa Rápido SMM Pt2', arquivo: 'files/ESTRATEGIA CAIXA RAPIDO COM SMM PT2 By ShadowTX.pdf', img: '', desc: 'Estratégia avançada SMM' },
    { cat: 'nicho', nome: 'Business Completo SMM 0 Ao Avançado', arquivo: 'files/BUSINESS COMPLETO DE SMM DO 0 AO AVANÇADO.pdf', img: '', desc: 'Curso completo SMM' },
    { cat: 'nicho', nome: 'Arroz e Feijão Vender Muito', arquivo: 'files/[NICHO HOT] - O ARROZ E FEIJÃO PRA VENDER MUITO [PARTE 2].pdf', img: '', desc: 'Método de vendas' },
    { cat: 'nicho', nome: 'ADS FREE', arquivo: 'files/ADS FREE.pdf', img: '', desc: 'Guia Ads Free' },
    { cat: 'nicho', nome: 'E-book Gratuito Nicho Hot', arquivo: 'files/🎁 (E-book gratuito - como começar no Nicho Hot).pdf', img: '', desc: 'E-book gratuito' },
    { cat: 'nicho', nome: 'Melhor Estratégia Levantar Caixa', arquivo: 'files/NICHO_HOT_A_MELHOR_ESTRATÉGIA_PRA_LEVANTAR_CAIXA_PARTE_1.pdf', img: '', desc: 'Estratégia premium' },
    { cat: 'nicho', nome: 'Orgânico HOT', arquivo: 'files/Organico - HOT.pdf', img: '', desc: 'Tráfego orgânico' },
    { cat: 'nicho', nome: 'Estrutura HOT R$500 Dia', arquivo: 'files/ESTRUTURA HOT - R$500 DIA (2).pdf', img: '', desc: 'Estrutura de ganhos' },
    { cat: 'nicho', nome: 'Leads Qualificados', arquivo: 'files/LEADS QUALIFICADOS.pdf', img: '', desc: 'Captação de leads' },
    { cat: 'nicho', nome: 'Conteúdo Plus Nicho Hot', arquivo: 'files/Conteúdo Plus Nicho Hot.pdf', img: '', desc: 'Conteúdo exclusivo' },
    { cat: 'nicho', nome: 'Perfil Modelo Ideal', arquivo: 'files/[PLATINUM] COMO DETERMINAR O PERFIL DE MODELO IDEAL.pdf', img: '', desc: 'Perfil de modelo' },
    { cat: 'nicho', nome: '100 a 500 Reais Por Dia', arquivo: 'files/Como_fazer_de_100_a_500_reais_por_dia_com_nicho_hot_ainda_essa_semana!.pdf', img: '', desc: 'Ganhos rápidos' },
    { cat: 'nicho', nome: 'Modelo Black Hat', arquivo: 'files/[CONTEÚDO PLUS] MODELO BLACK HAT.pdf', img: '', desc: 'Modelo avançado' },
    { cat: 'nicho', nome: 'Capture O Tubarão', arquivo: 'files/CAPTURE O TUBARÃO.pdf', img: '', desc: 'Estratégia de captura' },
    // Business & Design
    { cat: 'design', nome: 'Social Media Mockup', arquivo: 'files/social-media-mockup.rar', img: 'photos/photo_8@17-03-2026_21-19-11_thumb.jpg', desc: 'Mockups para redes sociais' },
    { cat: 'design', nome: 'Social Media Mockup', arquivo: 'files/social-media-mockup-.rar', img: '', desc: 'Pack mockups' },
    { cat: 'design', nome: 'Pack 60 LUTs Ronei Rodrigues', arquivo: 'files/PACK 60 LUTS RONEI RODRIGUES.rar', img: '', desc: '60 LUTs profissionais' },
    { cat: 'design', nome: '3000 Templates Canva', arquivo: 'files/[3000] Templates Canva (1).rar', img: 'photos/photo_32@17-03-2026_21-42-49_thumb.jpg', desc: '3.000 templates editáveis' },
    { cat: 'design', nome: '12.000 Posts Prontos Canva', arquivo: 'files/+ 12.000 POSTS PRONTOS ( Canva) (100% Editaveis).rar', img: 'photos/photo_33@17-03-2026_21-42-49_thumb.jpg', desc: '12 mil posts editáveis' },
    // Vídeos Lifestyle
    { cat: 'videos', nome: 'Dinheiro', arquivo: 'files/Dinheiro-20240303T201911Z-001.zip', img: '', desc: 'Vídeos lifestyle dinheiro' },
    { cat: 'videos', nome: 'Estudando', arquivo: 'files/Estudando-20240303T201904Z-001.zip', img: '', desc: 'Vídeos lifestyle estudando' },
    { cat: 'videos', nome: 'Refletindo', arquivo: 'files/Refletindo -20240303T201926Z-001.zip', img: '', desc: 'Vídeos lifestyle' },
    { cat: 'videos', nome: 'Festa, Bebidas, Bailes', arquivo: 'files/Festa, Bebidas, Bailes-20240303T201900Z-001.zip', img: '', desc: 'Vídeos festa' },
    { cat: 'videos', nome: 'Jet Ski', arquivo: 'files/Jet ski-20240303T201855Z-001.zip', img: '', desc: 'Vídeos jet ski' },
    { cat: 'videos', nome: 'Academia', arquivo: 'files/Academia -20240303T201922Z-001.zip', img: '', desc: 'Vídeos academia' },
    { cat: 'videos', nome: 'Barcos', arquivo: 'files/Barcos -20240303T201919Z-001.zip', img: '', desc: 'Vídeos barcos' },
    { cat: 'videos', nome: 'Frases Motivadoras', arquivo: 'files/4. FRASES MOTIVADORAS-20240303T201743Z-001.zip', img: '', desc: 'Frases motivacionais' },
    { cat: 'videos', nome: 'Be Your Boss', arquivo: 'files/Be Your Boss-20240303T201949Z-001.zip', img: '', desc: 'Vídeos empreendedorismo' },
    // CRM & WhatsApp
    { cat: 'crm', nome: 'WaCRM', arquivo: 'files/WaCRM (1).rar', img: 'photos/photo_26@17-03-2026_21-41-06_thumb.jpg', desc: 'CRM para WhatsApp' },
    { cat: 'crm', nome: 'Pack 1.000 Funis', arquivo: 'files/PACK 1.000 FUNIS.zip', img: '', desc: '1.000 funis prontos' },
    { cat: 'crm', nome: '548 Fluxos Prontos', arquivo: 'files/548 Fluxos Prontos.zip', img: '', desc: '548 fluxos de automação' },
    { cat: 'business', nome: 'CRM Script PHP 2018', arquivo: 'files/CRM Script Php Crm 2018.zip', img: '', desc: 'Script CRM PHP' },
    // Outros
    { cat: 'outros', nome: 'VPN Master BR', arquivo: 'files/VPN MASTER🇧🇷4️⃣.apk', img: '', desc: 'App VPN para Android' },
    { cat: 'outros', nome: 'Extrator de CT', arquivo: 'files/EXTRATOR DE CT.pdf', img: '', desc: 'Extrator de contatos' },
    // Educação / E-books
    { cat: 'educacao', nome: 'Papo de Cama', arquivo: 'files/Bônus 4 - Papo de Cama (1).pdf', img: '', desc: 'E-book relacionamento' },
    { cat: 'educacao', nome: 'Prazer Privado Incrível', arquivo: 'files/Bônus 5 - Prazer Privado Incrível (1).pdf', img: '', desc: 'E-book' },
    { cat: 'educacao', nome: 'Poder dos Alimentos', arquivo: 'files/Bônus 6 - O Poder dos Alimentos (1).pdf', img: '', desc: 'E-book nutrição' },
    { cat: 'educacao', nome: 'Bônus Surpresa', arquivo: 'files/Bônus 7 - Bônus Surpresa (1).pdf', img: '', desc: 'Bônus exclusivo' },
    { cat: 'educacao', nome: 'Orgasmos Inacreditáveis', arquivo: 'files/05 - Orgasmos Inacreditáveis (1).pdf', img: '', desc: 'E-book' },
    { cat: 'educacao', nome: 'Mãos Mágicas', arquivo: 'files/Bônus 3 - Mãos Mágicas (1).pdf', img: '', desc: 'E-book' },
    { cat: 'educacao', nome: 'Fundamentos do Prazer', arquivo: 'files/01 - Fundamentos do Prazer (1).pdf', img: '', desc: 'E-book' },
    { cat: 'educacao', nome: 'Preliminares Incríveis', arquivo: 'files/02 - Preliminares Incríveis (1).pdf', img: '', desc: 'E-book' },
    { cat: 'educacao', nome: 'Mestre em Sexo Oral', arquivo: 'files/03 - Mestre em Sexo Oral (1).pdf', img: '', desc: 'E-book' },
    { cat: 'educacao', nome: 'Segredos do Sexo Anal', arquivo: 'files/04 - Segredos do Sexo Anal (1).pdf', img: '', desc: 'E-book' },
    // Arquivos Freepik (link externo MEGA)
    { cat: 'design', nome: 'Arquivos Freepik Premium 38GB', arquivo: 'https://mega.nz/folder/649w1IYa#9kjBeF9njnHLxIvh1S8sSA', img: 'photos/photo_83@17-03-2026_22-02-45_thumb.jpg', desc: '38 GB de conteúdo premium Freepik — vetores, mockups, imagens' }
  ]
};
