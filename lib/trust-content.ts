import type { Locale } from "@/lib/templates";

export type TrustPageKey = "privacy" | "legal" | "about";

type TrustSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type TrustPageContent = {
  key: TrustPageKey;
  locale: Locale;
  slug: string;
  alternateSlug: string;
  eyebrow: string;
  title: string;
  description: string;
  intro: string;
  sections: TrustSection[];
};

const pages: TrustPageContent[] = [
  {
    key: "privacy",
    locale: "fr",
    slug: "confidentialite",
    alternateSlug: "privacy",
    eyebrow: "CONFIDENTIALITÉ, SANS FLOU",
    title: "Tes photos restent sur ton appareil",
    description: "Politique de confidentialité de Mosaipix : photos locales, prompts IA, mesure d’audience et droits sur vos données.",
    intro: "Mosaipix a été conçu pour collecter le moins possible. Une photo importée est transformée localement dans ton navigateur. Quand tu demandes une image à l’IA ou une recherche d’image libre, seul le texte de ta demande est envoyé en ligne.",
    sections: [
      {
        title: "Ce qui reste uniquement sur ton appareil",
        bullets: [
          "Les photos que tu sélectionnes : elles sont lues et transformées par ton navigateur, sans être téléversées vers Mosaipix.",
          "La grille obtenue et ta progression : elles sont sauvegardées dans le stockage local du navigateur pour te permettre de reprendre plus tard.",
          "Ta préférence de langue. Tu peux supprimer ces éléments en effaçant les données du site dans les réglages de ton navigateur.",
        ],
      },
      {
        title: "Quand tu utilises la création par IA",
        paragraphs: [
          "Le texte de ta demande, l’ambiance choisie, le niveau de détail et la langue sont transmis au serveur Mosaipix, puis à Vercel AI Gateway et au fournisseur du modèle d’image afin de produire l’illustration. La photo de ton appareil n’est jamais jointe à cette demande.",
          "Mosaipix demande au fournisseur de ne pas utiliser les prompts pour entraîner ses modèles. N’écris toutefois aucune information personnelle, confidentielle ou sensible dans ta description.",
        ],
        bullets: [
          "Finalité : créer l’image demandée et protéger le service contre les abus.",
          "Limitation : 3 créations par adresse réseau sur une période de 24 heures.",
          "Protection : l’adresse réseau est transformée en empreinte cryptographique avant d’être conservée par Mosaipix pour cette limitation, puis l’entrée expire après 24 heures.",
        ],
      },
      {
        title: "Quand tu recherches trois images libres",
        paragraphs: [
          "Le texte saisi sert à interroger Openverse. Pour une demande en français inconnue du petit dictionnaire local, il peut d’abord être traduit en quelques mots-clés anglais par un modèle Google Gemini via Vercel AI Gateway. Les résultats et leurs licences sont ensuite fournis par Openverse.",
          "L’image choisie est récupérée par le serveur Mosaipix, puis transformée localement dans ton navigateur. Les conditions et la licence de l’image source restent accessibles à côté du résultat.",
        ],
      },
      {
        title: "Mesure d’audience et journaux techniques",
        paragraphs: [
          "Mosaipix utilise Vercel Web Analytics pour connaître, de façon agrégée, les pages consultées, les appareils, navigateurs, pays approximatifs et sites référents. Cette mesure n’utilise pas de cookie publicitaire et n’est pas conçue pour suivre une personne d’un site à l’autre. L’identifiant anonyme de session est supprimé après 24 heures.",
          "Comme tout service hébergé, Vercel peut traiter des informations techniques de requête, notamment l’adresse IP, le navigateur, l’heure et l’URL demandée, pour assurer la sécurité, le fonctionnement et le diagnostic. Mosaipix ne vend pas ces données et n’affiche aucune publicité ciblée.",
        ],
      },
      {
        title: "Base juridique, destinataires et durée",
        bullets: [
          "Fonctionnement demandé par l’utilisateur : traitement local de la photo, création IA et recherche d’images.",
          "Intérêt légitime : sécurité, limitation des abus, diagnostic et mesure d’audience agrégée.",
          "Destinataires techniques : Vercel (hébergement, Analytics et AI Gateway), le fournisseur du modèle IA utilisé et Openverse pour la recherche d’images libres.",
          "Durées : projets jusqu’à leur suppression dans le navigateur ; empreinte de limitation IA 24 heures ; éventuels échanges par e-mail pendant le temps nécessaire à leur traitement, au maximum 12 mois sauf obligation légale.",
          "Ces prestataires peuvent traiter des données hors de l’Espace économique européen selon leurs propres garanties contractuelles et politiques de confidentialité.",
        ],
      },
      {
        title: "Tes droits",
        paragraphs: [
          "Tu peux demander l’accès, la rectification, l’effacement, la limitation ou l’opposition au traitement de tes données lorsque ces droits s’appliquent. Écris à l’adresse indiquée sur la page À propos. Tu peux aussi adresser une réclamation à la CNIL. Comme aucun compte n’est créé, joins suffisamment de contexte pour que ta demande puisse être retrouvée sans envoyer de donnée sensible.",
        ],
      },
    ],
  },
  {
    key: "privacy",
    locale: "en",
    slug: "privacy",
    alternateSlug: "confidentialite",
    eyebrow: "PRIVACY, IN PLAIN LANGUAGE",
    title: "Your photos stay on your device",
    description: "Mosaipix privacy policy covering local photos, AI prompts, audience analytics and your data rights.",
    intro: "Mosaipix is designed to collect as little as possible. An imported photo is converted locally in your browser. When you request an AI image or search for an open image, only the text of your request is sent online.",
    sections: [
      {
        title: "What stays only on your device",
        bullets: [
          "Photos you select are read and converted by your browser and are never uploaded to Mosaipix.",
          "The resulting grid and your coloring progress are saved in browser local storage so you can resume later.",
          "Your language preference. You can remove these items by clearing Mosaipix site data in your browser settings.",
        ],
      },
      {
        title: "When you use AI creation",
        paragraphs: [
          "Your written request, selected style, detail level and language are sent to the Mosaipix server, then to Vercel AI Gateway and the image model provider to create the illustration. A photo from your device is never attached to this request.",
          "Mosaipix instructs the provider not to use prompts to train its models. You should still never include personal, confidential or sensitive information in a description.",
        ],
        bullets: [
          "Purpose: create the requested image and protect the service from abuse.",
          "Limit: 3 creations per network address in each 24-hour period.",
          "Protection: Mosaipix turns the network address into a cryptographic hash before storing it for rate limiting, and the entry expires after 24 hours.",
        ],
      },
      {
        title: "When you search for three open images",
        paragraphs: [
          "The text you enter is used to search Openverse. If a French request is not recognized by the small local dictionary, it may first be translated into a few English keywords by a Google Gemini model through Vercel AI Gateway. Openverse then supplies results and license information.",
          "The chosen image is fetched by the Mosaipix server, then converted locally in your browser. The source image terms and license remain available beside the result.",
        ],
      },
      {
        title: "Audience analytics and technical logs",
        paragraphs: [
          "Mosaipix uses Vercel Web Analytics to understand, in aggregate, viewed pages, devices, browsers, approximate countries and referring sites. It uses no advertising cookie and is not designed to track a person across different websites. Its anonymous session identifier is discarded after 24 hours.",
          "Like any hosted service, Vercel may process technical request information such as IP address, browser, time and requested URL for security, operation and diagnostics. Mosaipix does not sell this data and displays no targeted advertising.",
        ],
      },
      {
        title: "Legal basis, recipients and retention",
        bullets: [
          "User-requested operation: local photo conversion, AI creation and open-image search.",
          "Legitimate interests: security, abuse prevention, diagnostics and aggregate audience analytics.",
          "Technical recipients: Vercel (hosting, Analytics and AI Gateway), the selected AI model provider and Openverse for open-image search.",
          "Retention: projects until removed from the browser; AI rate-limit hash for 24 hours; email exchanges for as long as needed to handle them, no longer than 12 months unless legally required.",
          "These providers may process data outside the European Economic Area under their own contractual safeguards and privacy policies.",
        ],
      },
      {
        title: "Your rights",
        paragraphs: [
          "You may request access, correction, deletion, restriction or objection where those rights apply. Write to the address on the About page. You may also lodge a complaint with the French data protection authority, the CNIL. Since Mosaipix creates no account, include enough context for your request to be located without sending sensitive data.",
        ],
      },
    ],
  },
  {
    key: "legal",
    locale: "fr",
    slug: "mentions-legales",
    alternateSlug: "legal-notice",
    eyebrow: "INFORMATIONS LÉGALES",
    title: "Mentions légales",
    description: "Éditeur, hébergeur, propriété intellectuelle et conditions d’utilisation du site Mosaipix.",
    intro: "Les informations ci-dessous identifient les responsables du site mosaipix.com et précisent les principales règles d’utilisation du service.",
    sections: [
      {
        title: "Hébergement",
        paragraphs: [
          "Le site est hébergé par Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis. Téléphone : +1 559 288 7060. Site : vercel.com.",
        ],
      },
      {
        title: "Objet du service",
        paragraphs: [
          "Mosaipix est une application gratuite de loisir permettant de créer, colorier, télécharger et imprimer des grilles de pixel art à partir de modèles, de photos locales, d’images libres ou d’illustrations générées par IA. Aucun compte ni achat n’est actuellement proposé.",
        ],
      },
      {
        title: "Propriété intellectuelle",
        paragraphs: [
          "La marque Mosaipix, l’interface, les textes, les modèles originaux et le code du site sont protégés par les règles applicables à la propriété intellectuelle, sauf mention contraire. Une utilisation personnelle des créations exportées est autorisée. Toute reproduction commerciale du site, de son identité ou de sa bibliothèque nécessite une autorisation préalable.",
          "Les images proposées par Openverse restent la propriété de leurs auteurs et sont soumises à la licence indiquée avec chaque résultat. Il appartient à l’utilisateur de respecter l’attribution et les éventuelles conditions de la source.",
        ],
      },
      {
        title: "Responsabilité",
        paragraphs: [
          "Le service est fourni gratuitement et peut évoluer ou être interrompu. Mosaipix s’efforce de fournir des résultats utilisables, mais ne garantit ni la disponibilité continue ni l’exactitude, la qualité ou l’originalité d’une image générée par IA. Ne saisis pas de contenu illicite, confidentiel ou portant atteinte aux droits d’un tiers.",
        ],
      },
      {
        title: "Données personnelles",
        paragraphs: [
          "Le détail des traitements, des prestataires et de tes droits est présenté dans la politique de confidentialité, accessible depuis toutes les pages du site.",
        ],
      },
    ],
  },
  {
    key: "legal",
    locale: "en",
    slug: "legal-notice",
    alternateSlug: "mentions-legales",
    eyebrow: "LEGAL INFORMATION",
    title: "Legal notice",
    description: "Publisher, hosting provider, intellectual property and terms of use for the Mosaipix website.",
    intro: "The information below identifies those responsible for mosaipix.com and sets out the main rules for using the service.",
    sections: [
      {
        title: "Hosting",
        paragraphs: [
          "The website is hosted by Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, United States. Phone: +1 559 288 7060. Website: vercel.com.",
        ],
      },
      {
        title: "Purpose of the service",
        paragraphs: [
          "Mosaipix is a free creative application for creating, coloring, downloading and printing pixel-art grids from patterns, local photos, open images or AI-generated illustrations. It currently offers no account or purchase.",
        ],
      },
      {
        title: "Intellectual property",
        paragraphs: [
          "The Mosaipix name, interface, copy, original patterns and website code are protected by applicable intellectual-property rules unless stated otherwise. Personal use of exported creations is allowed. Commercial reproduction of the website, identity or pattern library requires prior permission.",
          "Images suggested by Openverse remain the property of their creators and are subject to the license shown with each result. Users are responsible for following attribution and source requirements.",
        ],
      },
      {
        title: "Liability",
        paragraphs: [
          "The service is provided free of charge and may change or be interrupted. Mosaipix aims to provide useful results but does not guarantee uninterrupted availability or the accuracy, quality or originality of an AI-generated image. Do not submit unlawful, confidential or third-party infringing content.",
        ],
      },
      {
        title: "Personal data",
        paragraphs: [
          "Processing details, service providers and your rights are explained in the privacy policy, linked from every page of the website.",
        ],
      },
    ],
  },
  {
    key: "about",
    locale: "fr",
    slug: "a-propos",
    alternateSlug: "about",
    eyebrow: "À PROPOS DE MOSAIPIX",
    title: "Le pixel art comme loisir, pas comme logiciel compliqué",
    description: "Découvre la mission de Mosaipix et contacte son créateur pour partager une idée ou un retour.",
    intro: "Mosaipix est né d’une idée simple : partir d’une image ou d’une envie, obtenir une vraie grille de pixels lisible, puis prendre plaisir à la colorier à l’écran ou sur papier.",
    sections: [
      {
        title: "Un studio volontairement simple",
        paragraphs: [
          "L’application privilégie un démarrage immédiat, sans compte ni paiement. Les réglages courants restent visibles et les options plus fines sont rangées dans un niveau avancé. Le but n’est pas de remplacer un logiciel professionnel, mais d’offrir une activité créative claire et agréable sur mobile, tablette et ordinateur.",
        ],
      },
      {
        title: "Nos principes",
        bullets: [
          "De vrais pixels : une grille nette et modifiable, jamais un simple filtre flou.",
          "La vie privée par défaut : les photos et projets restent sur l’appareil.",
          "Une IA encadrée : descriptions courtes, budget limité et solution d’images libres.",
          "Un résultat partageable : coloriage à l’écran, téléchargement et impression papier.",
        ],
      },
      {
        title: "Contact et retours",
        paragraphs: [
          "Une idée de modèle, un résultat étrange, un souci sur mobile ou simplement une remarque ? Chaque retour aide à choisir les prochaines améliorations. Le bouton « Donner mon avis » ouvre ton application e-mail : aucun formulaire ni compte supplémentaire.",
        ],
      },
    ],
  },
  {
    key: "about",
    locale: "en",
    slug: "about",
    alternateSlug: "a-propos",
    eyebrow: "ABOUT MOSAIPIX",
    title: "Pixel art as a pastime, not complicated software",
    description: "Discover the Mosaipix mission and contact its creator to share an idea or feedback.",
    intro: "Mosaipix began with a simple idea: start from an image or an idea, get a clear grid of real pixels, then enjoy coloring it on screen or on paper.",
    sections: [
      {
        title: "A deliberately simple studio",
        paragraphs: [
          "The application is designed for an immediate start, with no account or payment. Everyday controls stay visible and finer options sit under an advanced level. The aim is not to replace professional software, but to provide a clear, enjoyable creative activity on mobile, tablet and desktop.",
        ],
      },
      {
        title: "Our principles",
        bullets: [
          "Real pixels: a crisp, editable grid, never just a blurry filter.",
          "Privacy by default: photos and projects stay on the device.",
          "Bounded AI: short descriptions, a limited budget and an open-image fallback.",
          "A result you can keep: on-screen coloring, downloads and paper printing.",
        ],
      },
      {
        title: "Contact and feedback",
        paragraphs: [
          "Have a pattern idea, an odd result, a mobile issue or a quick comment? Every message helps prioritize the next improvements. The “Share feedback” button opens your email application, with no extra form or account.",
        ],
      },
    ],
  },
];

export function getTrustPage(locale: Locale, slug: string) {
  return pages.find((page) => page.locale === locale && page.slug === slug);
}

export function getTrustPageByKey(locale: Locale, key: TrustPageKey) {
  return pages.find((page) => page.locale === locale && page.key === key);
}

export function getTrustPages(locale?: Locale) {
  return locale ? pages.filter((page) => page.locale === locale) : pages;
}
