# LabelGenerator

LabelGenerator è un'estensione per Visual Studio Code che consente di applicare etichette a file JSON e XML selezionati e di eseguire script di tipo exe.


## Funzionalità

- Selezione di file multipli.
- Applicazione di etichette a file JSON e XML.
- Esecuzione di script selezionati.


## Utilizzo
Questa estensione serve per generare in automatico delle label inserendole in automatico in file di tipo json e xml già esistenti


### Comandi Disponibili

- `LabelGenerator`: Apre la Webview per la gestione delle etichette.
eseguibile tramite la shortcut Ctrl-shift-l
E' presente un solo comando dato che è presente un interfaccia grafica.


### Selezione dei File

1. Apri la Webview tramite il comando `LabelGenerator`.
2. Clicca sul pulsante per selezionare i file.
3. Seleziona i file desiderati.


### Applicazione delle Etichette

1. Apri la Webview tramite il comando `LabelGenerator`.
2. Inserisci il nome dell'etichetta e i valori delle etichette.
3. Clicca sul pulsante per applicare le etichette.
4. Tutto questo dopo aver selezionato i file.


## Utilizzo script file .exe

In aggiunta è possibile inserire un file di tipo exe che verrà eseguito nel terminale una volta caricate le label.


## Errori visualizzabili

- Se si cerca di caricare la label senza aver inserito il nome della label o uno dei valori corrispondente ai file selezionati apparirà un avviso di errore in basso a destra


## Note

- La versione attuale supporta solo la creazione di label solo per file json e xml
- La versione attuale permette il salvataggio dei file caricati anche dopo aver chiuso l'estensione, vengono memorizzati nel pannello gli utlimi file caricati. 


## Licenza

Questo progetto è distribuito sotto la [MIT License](./LICENSE)


# Versione 

1.0.0 Versione iniziale

1.0.1 Correzione di alcuni bug segnalati

1.0.2 Correzione di alcuni bug segnalati

1.0.3 Correzione di alcuni bug e aggiunta di un'immagine

1.0.4 Correzione di alcuni bug segnalati

1.0.5 Correzione di alcuni bug segnalati