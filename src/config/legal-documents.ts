export const CURRENT_DPA_VERSION = 'v1';

export const DPA_CONTENT = {
    'v1': {
        title: "Contrat de Sous-Traitance (DPA)",
        sections: [
            {
                title: "1. Objet du contrat",
                content: "Le présent accord a pour objet de définir les conditions dans lesquelles le Sous-traitant s'engage à effectuer pour le compte du Responsable de traitement les opérations de traitement de données à caractère personnel définies ci-après."
            },
            {
                title: "2. Description du traitement",
                content: "Le Sous-traitant est autorisé à traiter pour le compte du Responsable de traitement les données personnelles nécessaires à la fourniture des services suivants : Génération et transmission de leads qualifiés via API."
            },
            {
                title: "3. Obligations du Sous-traitant",
                content: `Le Sous-traitant s'engage à :
- Traiter les données uniquement pour la ou les seule(s) finalité(s) qui fait/font l’objet de la sous-traitance
- Garantir la confidentialité des données à caractère personnel traitées
- Veiller à ce que les personnes autorisées à traiter les données s’engagent à respecter la confidentialité`
            },
            {
                title: "4. Mesures de sécurité",
                content: "Le Sous-traitant s'engage à mettre en œuvre les mesures techniques et organisationnelles appropriées pour garantir un niveau de sécurité adapté au risque."
            }
        ]
    }
} as const;

export type DpaVersion = keyof typeof DPA_CONTENT;
