# propulso-test-tech

## Logique
Voici les définitions utilisées:
- **Visite**: Pour un visiteur (`propulso_id` unique), plage de données passage dans la zone (`dt = 0`) 
- **Déplacement**: Pour un visiteur (`propulso_id` unique): plage de donnée contigue (`dt > 0` et `dt < 0`) entourant une visite (`dt = 0`)
- **Nombre de jours entre les visites**: On calcule le nombre de jours entre deux visites entre la fin de la première et le début de la deuxième

Voici les hypothèses posées :
- **Tri initial**: Les données initiales ne sont pas garanties d'être triées.
- **Précision**: Les données de localisation sont précises à 100%.
- **Durée d'une visite**: Une visite dure plus de `TIME_TRESHOLD` secondes (présentement, 5 min)
- **Pings éloignés**: Si deux *pings* d'une même visite sont distants de plus de `MAX_VISIT_TIME_GAP` secondes (présentement, 24h), on considère que le deuxième signifie le début d'une nouvelle visite.

## Exécution
Démarrer le back-end avec 
```
npm install
export NODE_OPTIONS=--max_old_space_size=8192
npm start
``` 

puis le front-end avec 
```
npm install
npm run serve 
``` 

et visiter 
```
localhost:8081
```

