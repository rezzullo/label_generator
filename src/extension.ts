import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseStringPromise, Builder } from 'xml2js';

let selectedFiles: vscode.Uri[] = [];
let selectedScript: vscode.Uri | null = null;
let terminal: vscode.Terminal | null = null;
let existingLabelNames: string[] = [];

const webviewHtmlContent = ``

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "labelgenerator" is now active!');

    // Recupera i file selezionati dal globalState
    const savedFiles = context.globalState.get<vscode.Uri[]>('selectedFiles', []);
    if (savedFiles.length > 0) {
        selectedFiles = savedFiles;
    }

    const generateLabelDisposable = vscode.commands.registerCommand('LabelGenerator', () => {
        const panel = vscode.window.createWebviewPanel(
            'labelGenerator',
            'Label Generator',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'out'))]
            }
        );

        panel.webview.html = getWebviewContent(context, panel, 'webview.html');

        // Invia i file salvati al pannello webview
        if (selectedFiles.length > 0) {
            const fileNames = selectedFiles.map(file => {
                const fileName = path.basename(file.fsPath, path.extname(file.fsPath));
                const fileType = path.extname(file.fsPath).substring(1).toUpperCase();
                return `${fileName} (${fileType})`;
            });
            panel.webview.postMessage({ command: 'updateFiles', files: fileNames });

            // Aggiorna i nomi delle etichette esistenti
            getExistingLabelNames(selectedFiles).then(labelNames => {
                existingLabelNames = labelNames;
                panel.webview.postMessage({ command: 'updateLabelNames', labelNames: existingLabelNames });
            });
        }

        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'selectFiles':
                        selectFiles(panel, context);
                        return;
                    case 'applyLabels':
                        applyLabels(message.labelName, message.labelValues);
                        return;
                    case 'selectScript':
                        selectScript(panel);
                        return;
                    case 'suggestLabelNames':
                        panel.webview.postMessage({ command: 'updateLabelNames', labelNames: existingLabelNames });
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(generateLabelDisposable);

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.selectScript', async () => {
            const script = await vscode.window.showOpenDialog({
                canSelectMany: false,
                openLabel: 'Select Script',
                filters: {
                    'Executable Files': ['exe'] // Aggiornato per selezionare solo file .exe
                }
            });

            if (script && script.length > 0) {
                selectedScript = script[0];
                vscode.window.showInformationMessage(`Script selezionato: ${selectedScript.fsPath}`);
            }
        }),

        vscode.commands.registerCommand('extension.applyLabels', async () => {
            const labelName = await vscode.window.showInputBox({
                prompt: 'Inserisci il nome dell\'etichetta',
                validateInput: async (value) => {
                    if (value.length === 0) {
                        return 'Il nome dell\'etichetta non può essere vuoto';
                    }
                    return null;
                }
            });

            if (!labelName) {
                return;
            }

            const labelValues = await vscode.window.showInputBox({ prompt: 'Inserisci i valori delle etichette separati da virgola' });

            if (labelName && labelValues) {
                const labelValuesArray = labelValues.split(',').map(value => value.trim());
                await applyLabels(labelName, labelValuesArray);
            }
        }),

        vscode.commands.registerCommand('extension.suggestLabelNames', async () => {
            const labelName = await vscode.window.showQuickPick(existingLabelNames, {
                placeHolder: 'Seleziona un nome di etichetta esistente o inseriscine uno nuovo'
            });

            if (labelName) {
                const labelValues = await vscode.window.showInputBox({ prompt: 'Inserisci i valori delle etichette separati da virgola' });

                if (labelValues) {
                    const labelValuesArray = labelValues.split(',').map(value => value.trim());
                    await applyLabels(labelName, labelValuesArray);
                }
            }
        })
    );
}

async function selectFiles(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    const files = await vscode.window.showOpenDialog({
        canSelectMany: true,
        openLabel: 'Select Files',
        filters: {
            'All files': ['*']
        }
    });

    if (files) {
        selectedFiles = files;

        // Salva i file selezionati nel globalState
        context.globalState.update('selectedFiles', selectedFiles);

        const fileNames = files.map(file => {
            const fileName = path.basename(file.fsPath, path.extname(file.fsPath));
            const fileType = path.extname(file.fsPath).substring(1).toUpperCase();
            return `${fileName} (${fileType})`;
        });
        panel.webview.postMessage({ command: 'updateFiles', files: fileNames });

        // Aggiorna i nomi delle etichette esistenti
        existingLabelNames = await getExistingLabelNames(files);
        panel.webview.postMessage({ command: 'updateLabelNames', labelNames: existingLabelNames });
    }
}

async function getExistingLabelNames(files: vscode.Uri[]): Promise<string[]> {
    const labelNames = new Set<string>();

    for (const file of files) {
        const filePath = file.fsPath;
        const ext = path.extname(filePath).toLowerCase();

        if (ext === '.json') {
            const content = fs.readFileSync(filePath, 'utf8');
            const jsonContent = JSON.parse(content);
            Object.keys(jsonContent).forEach(key => labelNames.add(key));
        } else if (ext === '.xml') {
            const content = fs.readFileSync(filePath, 'utf8');
            const xmlContent = await parseStringPromise(content);
            if (xmlContent.root && xmlContent.root.data) {
                xmlContent.root.data.forEach((data: any) => labelNames.add(data.$.name));
            }
        }
    }

    return Array.from(labelNames);
}

async function selectScript(panel: vscode.WebviewPanel) {
    const script = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Select Script',
        filters: {
            'Executable Files': ['exe']
        }
    });

    if (script && script.length > 0) {
        selectedScript = script[0];
        vscode.window.showInformationMessage(`Script selezionato: ${selectedScript.fsPath}`);
        panel.webview.postMessage({ command: 'updateScript', script: selectedScript.fsPath });
    }
}

async function applyLabels(labelName: string, labelValues: string[]) {
    if (!labelName) {
        vscode.window.showErrorMessage('Nome dell\'etichetta non inserito. Inserisci il nome dell\'etichetta prima di applicarla.');
        return;
    }

    if (selectedFiles.length === 0) {
        vscode.window.showErrorMessage('Nessun file selezionato. Seleziona i file prima di applicare le etichette.');
        return;
    }

    for (const [index, file] of selectedFiles.entries()) {
        const filePath = file.fsPath;
        const labelValue = labelValues[index];

        if (!labelValue) {
            vscode.window.showErrorMessage(`Valore dell'etichetta non inserito per il file: ${filePath}. Inserisci un valore prima di applicare l'etichetta.`);
            continue;
        }

        const ext = path.extname(filePath).toLowerCase();

        if (ext === '.json') {
            await applyJsonLabel(filePath, labelName, labelValue);
        } else if (ext === '.xml') {
            await applyXmlLabel(filePath, labelName, labelValue);
        }
    }

    // Aggiungi il nome dell'etichetta all'elenco dei nomi esistenti
    if (!existingLabelNames.includes(labelName)) {
        existingLabelNames.push(labelName);
    }

    if (selectedScript) {
        await executeCodeFromFile(selectedScript.fsPath);
    }

    vscode.window.showInformationMessage('Etichette applicate con successo ai file selezionati.');
}

async function executeCodeFromFile(filePath: string) {
    if (!terminal) {
        terminal = vscode.window.createTerminal('Script Terminal');
    }
    terminal.show();
    terminal.sendText(`${filePath}`); // Esegue il file .exe nel terminale senza stampare il percorso
}

async function applyJsonLabel(filePath: string, labelName: string, labelValue: string) {
    let fileContent = fs.readFileSync(filePath, 'utf8').trim();

    if (fileContent === '') {
        fileContent = '{}';
    }

    let jsonContent;
    try {
        jsonContent = JSON.parse(fileContent);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Errore nel parsing del file JSON: ${filePath}\nContenuto: ${fileContent}\nErrore: ${error.message}`);
        return;
    }

    if (jsonContent.hasOwnProperty(labelName)) {
        const overwrite = await vscode.window.showInformationMessage(
            `L'etichetta "${labelName}" esiste già nel file ${filePath}. Vuoi sovrascriverla?`,
            { modal: true },
            'Sì',
        );

        if (overwrite !== 'Sì') {
            return;
        }
    }

    jsonContent[labelName] = labelValue;

    const updatedContent = JSON.stringify(jsonContent, null, 2);
    fs.writeFileSync(filePath, updatedContent, 'utf8');
}

async function applyXmlLabel(filePath: string, labelName: string, labelValue: string) {
    let fileContent = fs.readFileSync(filePath, 'utf8').trim();

    if (fileContent === '') {
        fileContent = '<root></root>';
    }

    let xmlContent;
    try {
        xmlContent = await parseStringPromise(fileContent);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Errore nel parsing del file XML: ${filePath}\nContenuto: ${fileContent}\nErrore: ${error.message}`);
        return;
    }

    if (!xmlContent.root) {
        xmlContent.root = {};
    }

    if (!xmlContent.root.data) {
        xmlContent.root.data = [];
    }

    const existingData = xmlContent.root.data.find((data: any) => data.$.name === labelName);

    if (existingData) {
        const overwrite = await vscode.window.showInformationMessage(
            `L'etichetta "${labelName}" esiste già nel file ${filePath}. Vuoi sovrascriverla?`,
            { modal: true },
            'Sì',
        );

        if (overwrite !== 'Sì') {
            return;
        }

        existingData.value = [labelValue];
    } else {
        xmlContent.root.data.push({
            $: { name: labelName, 'xml:space': 'preserve' },
            value: [labelValue]
        });
    }

    const builder = new Builder();
    const updatedContent = builder.buildObject(xmlContent);

    fs.writeFileSync(filePath, updatedContent, 'utf8');
}

function getWebviewContent(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, htmlFileName: string): string {
    const htmlPath = vscode.Uri.joinPath(context.extensionUri, 'out', htmlFileName);
    
    if (!fs.existsSync(htmlPath.fsPath)) {
        vscode.window.showErrorMessage(`File non trovato: ${htmlPath.fsPath}`);
        return '';
    }

    let html = fs.readFileSync(htmlPath.fsPath, 'utf8');
    return html;
}

export function deactivate() {
    if (terminal) {
        terminal.dispose();
    }
}
