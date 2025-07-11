"use strict";
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1'; 
import './config.js';
import './api.js';
import { createRequire } from 'module';
import path, { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { platform } from 'process';
import { readdirSync, statSync, unlinkSync, existsSync, readFileSync, watch } from 'fs';
import yargs from 'yargs';
import fs from 'fs';
import { readdir, unlink, stat } from 'fs/promises';
import { spawn, fork } from 'child_process';
import lodash from 'lodash';
import chalk from 'chalk';
import syntaxerror from 'syntax-error';
import { format } from 'util';
import pino from 'pino';
import Pino from 'pino';
import { Boom } from '@hapi/boom';
import { makeWASocket, protoType, serialize } from './src/libraries/simple.js';
import { Low, JSONFile } from 'lowdb';
import store from './src/libraries/store.js';
const { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidNormalizedUser, PHONENUMBER_MCC } = await import("@whiskeysockets/baileys");
import readline from 'readline';
import NodeCache from 'node-cache';
import { restaurarConfiguraciones } from './lib/funcConfig.js';
import { getOwnerFunction } from './lib/owner-funciones.js';
import mentionListener from './plugins/game-ialuna.js';
import { isCleanerEnabled } from './lib/cleaner-config.js';
import { startAutoCleanService } from './auto-cleaner.js';
import { privacyConfig, cleanOldUserData, secureLogger } from './privacy-config.js';

const { chain } = lodash;
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;
let stopped = 'close';  

protoType();
serialize();

const msgRetryCounterMap = new Map();

global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
  return rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString();
};

global.__dirname = function dirname(pathURL) {
  return path.dirname(global.__filename(pathURL, true));
};

global.__require = function require(dir = import.meta.url) {
  return createRequire(dir);
};

global.API = (name, path = '/', query = {}, apikeyqueryname) => (name in global.APIs ? global.APIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({...query, ...(apikeyqueryname ? {[apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name]} : {})})) : '');

global.timestamp = { start: new Date };
global.videoList = [];
global.videoListXXX = [];
const __dirname = global.__dirname(import.meta.url);
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse());
global.prefix = new RegExp('^[' + (opts['prefix'] || '*/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.\\-.@').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') + ']');
global.db = new Low(/https?:\/\//.test(opts['db'] || '') ? new cloudDBAdapter(opts['db']) : new JSONFile(`${opts._[0] ? opts._[0] + '_' : ''}database.json`));

global.loadDatabase = async function loadDatabase() {
  if (global.db.READ) {
    return new Promise((resolve) => setInterval(async function() {
      if (!global.db.READ) {
        clearInterval(this);
        resolve(global.db.data == null ? global.loadDatabase() : global.db.data);
      }
    }, 1 * 1000));
  }
  if (global.db.data !== null) return;
  global.db.READ = true;
  await global.db.read().catch(console.error);
  global.db.READ = null;
  global.db.data = {
    users: {},
    chats: {},
    stats: {},
    msgs: {},
    sticker: {},
    settings: {},
    privacy: {
      dataRetentionDays: privacyConfig.dataRetention.days,
      lastCleanup: Date.now(),
      userConsent: {}
    },
    ...(global.db.data || {}),
  };
  global.db.chain = chain(global.db.data);
};
loadDatabase();

/* Creditos a Otosaka (https://wa.me/51993966345) */

global.chatgpt = new Low(new JSONFile(path.join(__dirname, '/db/chatgpt.json')));
global.loadChatgptDB = async function loadChatgptDB() {
  if (global.chatgpt.READ) {
    return new Promise((resolve) =>
      setInterval(async function() {
        if (!global.chatgpt.READ) {
          clearInterval(this);
          resolve( global.chatgpt.data === null ? global.loadChatgptDB() : global.chatgpt.data );
        }
      }, 1 * 1000));
  }
  if (global.chatgpt.data !== null) return;
  global.chatgpt.READ = true;
  await global.chatgpt.read().catch(console.error);
  global.chatgpt.READ = null;
  global.chatgpt.data = {
    users: {},
    ...(global.chatgpt.data || {}),
  };
  global.chatgpt.chain = lodash.chain(global.chatgpt.data);
};
loadChatgptDB();

/* ------------------------------------------------*/

const {state, saveCreds} = await useMultiFileAuthState(global.authFile);
const { version } = await fetchLatestBaileysVersion();
let phoneNumber = global.botnumber || process.argv.find(arg => /^\+\d+$/.test(arg));

const methodCodeQR = process.argv.includes("qr")
const methodCode = !!phoneNumber || process.argv.includes("code")
const MethodMobile = process.argv.includes("mobile")
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (texto) => new Promise((resolver) => rl.question(texto, resolver))

let opcion = '1'; // Valor por defecto

// Mejorar la lógica de selección de método
try {
  if (methodCodeQR) {
    opcion = '1';
    console.log(chalk.yellow('[ ℹ️ ] Modo QR seleccionado desde argumentos'));
  } else if (methodCode && phoneNumber) {
    opcion = '2';
    console.log(chalk.yellow('[ ℹ️ ] Modo código seleccionado desde argumentos'));
  } else if (!fs.existsSync(`./${global.authFile}/creds.json`)) {
    console.log(chalk.cyan('[ ℹ️ ] No se encontró sesión existente'));
    do {
      opcion = await question(chalk.bgBlack(chalk.bold.yellowBright('[ ℹ️ ] Seleccione una opción:\n1. Con código QR\n2. Con código de texto de 8 dígitos\n---> ')));
      if (!/^[1-2]$/.test(opcion)) {
        console.log(chalk.red('[ ❗ ] Por favor, seleccione solo 1 o 2.\n'));
      }
    } while (!['1', '2'].includes(opcion));
  } else {
    console.log(chalk.green('[ ℹ️ ] Sesión existente encontrada'));
  }
} catch (error) {
  console.error(chalk.red('[ ❗ ] Error al seleccionar opción:'), error);
  opcion = '1'; // Fallback a QR
}

console.info = () => {} // https://github.com/skidy89/baileys actualmente no muestra logs molestos en la consola

const connectionOptions = {
    logger: Pino({ level: 'silent' }),
    printQRInTerminal: opcion === '1',

    // 🔧 CORREGIDO: mobile debe estar desactivado para pairing con código
    mobile: opcion === '2' ? false : MethodMobile,

    // 🔧 CORREGIDO: Browser limpio (sin "Pairing")
    browser: opcion === '1' 
        ? ['MichiBot', 'Safari', '2.0.0'] 
        : ['MichiBot', 'Chrome', '2.0.0'],

    auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(
            state.keys,
            Pino({ level: 'fatal' }).child({ level: 'fatal' })
        ),
    },

    // 🔧 CORREGIDO: no se debe tocar waWebSocketUrl (se mantiene estándar)
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,

    // ✅ Configuración específica para pairing
    qrTimeout: 40000,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    syncFullHistory: false,
    fireInitQueries: true,
    emitOwnEvents: true,

    getMessage: async (key) => {
        try {
            let jid = jidNormalizedUser(key.remoteJid);
            let msg = await store.loadMessage(jid, key.id);
            return msg?.message || "";
        } catch (e) {
            secureLogger?.error?.('Error en getMessage:', e);
            return '';
        }
    },

    patchMessageBeforeSending: async (message) => {
        try {
            global.conn.uploadPreKeysToServerIfRequired();
            return message;
        } catch (e) {
            secureLogger?.error?.('Error en patchMessageBeforeSending:', e);
            return message;
        }
    },

    msgRetryCounterCache: new NodeCache({ 
        stdTTL: 300,
        checkperiod: 60,
        useClones: false 
    }),
    userDevicesCache: new NodeCache({ 
        stdTTL: 3600,
        checkperiod: 300,
        useClones: false 
    }),

    cachedGroupMetadata: (jid) => {
        const chat = global.conn.chats[jid];
        if (chat) {
            return {
                id: chat.id,
                subject: chat.subject,
                participants: chat.participants?.length || 0
            };
        }
        return {};
    },
    version,
};

global.conn = makeWASocket(connectionOptions);
mentionListener(global.conn);
restaurarConfiguraciones(global.conn);
const ownerConfig = getOwnerFunction()
if (ownerConfig.modopublico) global.conn.public = true
if (ownerConfig.auread) global.opts['autoread'] = true
if (ownerConfig.modogrupos) global.conn.modogrupos = true
conn.ev.on('connection.update', connectionUpdate);

conn.logger.info(`[ ℹ️ ] Cargando...\n`);

if (!fs.existsSync(`./${global.authFile}/creds.json`)) {
    if (opcion === '2') {
        console.log(chalk.yellow('[ ℹ️ ] Modo código de 8 dígitos seleccionado'));
        
        if (MethodMobile) {
            console.log(chalk.red('[ ❗ ] No se puede usar código de emparejamiento con API móvil'));
            process.exit(1);
        }

        let numeroTelefono;
        
        if (phoneNumber) {
            // Usar número de teléfono proporcionado
            numeroTelefono = phoneNumber.replace(/[^0-9]/g, '');
            console.log(chalk.green('[ ℹ️ ] Usando número proporcionado:'), phoneNumber);
            
            // Validar formato
            if (!numeroTelefono.match(/^\d+$/) || !Object.keys(PHONENUMBER_MCC).some(v => numeroTelefono.startsWith(v))) {
                console.log(chalk.red('[ ❗ ] Número de teléfono inválido:'), phoneNumber);
                console.log(chalk.yellow('[ ℹ️ ] Formato correcto: +51999999999'));
                process.exit(1);
            }
        } else {
            // Solicitar número de teléfono
            while (true) {
                numeroTelefono = await question(chalk.bgBlack(chalk.bold.yellowBright('[ ℹ️ ] Escriba su número de WhatsApp (incluya código de país):\nEjemplo: +51999999999\n---> ')));
                numeroTelefono = numeroTelefono.replace(/[^0-9]/g, '');

                if (numeroTelefono.match(/^\d+$/) && Object.keys(PHONENUMBER_MCC).some(v => numeroTelefono.startsWith(v))) {
                    break;
                } else {
                    console.log(chalk.red('[ ❗ ] Número inválido. Use formato: +5493483511079'));
                }
            }
        }

        // Cerrar readline después de obtener el número
        if (!phoneNumber) {
            rl.close();
        }

        // Configurar el número antes de crear la conexión
        global.conn.phoneNumber = numeroTelefono;
        
        // ✅ SOLUCIÓN: Usar setTimeout en lugar de conn.ev.once
        setTimeout(async () => {
            try {
                console.log(chalk.yellow('[ ℹ️ ] Solicitando código de emparejamiento...'));
                
                // Solicitar código con retry logic
                let codigo;
                let intentos = 0;
                const maxIntentos = 3;
                
                while (intentos < maxIntentos) {
                    try {
                        codigo = await global.conn.requestPairingCode(numeroTelefono);
                        break;
                    } catch (error) {
                        intentos++;
                        console.log(chalk.red(`[ ❗ ] Intento ${intentos} fallido:`, error.message));
                        
                        if (intentos < maxIntentos) {
                            console.log(chalk.yellow(`[ ℹ️ ] Reintentando en 3 segundos...`));
                            await new Promise(resolve => setTimeout(resolve, 3000));
                        } else {
                            throw error;
                        }
                    }
                }
                
                if (codigo) {
                    codigo = codigo?.match(/.{1,4}/g)?.join("-") || codigo;
                    
                    console.log(chalk.green('════════════════════════════════'));
                    console.log(chalk.green.bold('🔐 CÓDIGO DE EMPAREJAMIENTO:'));
                    console.log(chalk.yellow.bold('   ' + codigo));
                    console.log(chalk.green('════════════════════════════════'));
                    console.log(chalk.cyan('[ ℹ️ ] Pasos para vincular:'));
                    console.log(chalk.cyan('1. Abre WhatsApp en tu teléfono'));
                    console.log(chalk.cyan('2. Ve a Configuración > Dispositivos vinculados'));
                    console.log(chalk.cyan('3. Toca "Vincular dispositivo"'));
                    console.log(chalk.cyan('4. Selecciona "Vincular con número de teléfono"'));
                    console.log(chalk.cyan('5. Ingresa el código de arriba'));
                    console.log(chalk.cyan('6. IMPORTANTE: Tienes 20 segundos para ingresar el código'));
                    console.log(chalk.green('════════════════════════════════'));
                    
                    // Renovar código cada 20 segundos
                    const intervaloCodigo = setInterval(async () => {
                        if (global.conn?.user) {
                            clearInterval(intervaloCodigo);
                            return;
                        }
                        
                        try {
                            console.log(chalk.yellow('[ ℹ️ ] Renovando código de emparejamiento...'));
                            const nuevoCodigo = await global.conn.requestPairingCode(numeroTelefono);
                            const codigoFormateado = nuevoCodigo?.match(/.{1,4}/g)?.join("-") || nuevoCodigo;
                            
                            console.log(chalk.green('════════════════════════════════'));
                            console.log(chalk.green.bold('🔐 NUEVO CÓDIGO DE EMPAREJAMIENTO:'));
                            console.log(chalk.yellow.bold('   ' + codigoFormateado));
                            console.log(chalk.green('════════════════════════════════'));
                            
                        } catch (error) {
                            console.log(chalk.red('[ ❗ ] Error al renovar código:', error.message));
                            
                            if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
                                console.log(chalk.yellow('[ ℹ️ ] Esperando debido a límite de velocidad...'));
                                clearInterval(intervaloCodigo);
                                setTimeout(() => {
                                    console.log(chalk.yellow('[ ℹ️ ] Reintentando conexión...'));
                                    process.exit(1);
                                }, 60000);
                            }
                        }
                    }, 20000);
                    
                    // Timeout para limpiar el intervalo después de 5 minutos
                    setTimeout(() => {
                        if (!global.conn?.user) {
                            clearInterval(intervaloCodigo);
                            console.log(chalk.red('[ ❗ ] Tiempo de vinculación agotado. Reinicia el bot.'));
                        }
                    }, 300000);
                }
                
            } catch (error) {
                console.error(chalk.red('[ ❗ ] Error al solicitar código de emparejamiento:'), error.message);
                
                if (error.message.includes('Unauthorized') || error.message.includes('401')) {
                    console.log(chalk.red('[ ❗ ] Error de autorización. Elimina la carpeta de sesión y vuelve a intentar.'));
                    process.exit(1);
                } else if (error.message.includes('rate limit') || error.message.includes('429')) {
                    console.log(chalk.yellow('[ ⚠ ] Límite de velocidad alcanzado. Espera 1 minuto antes de reintentar.'));
                    setTimeout(() => process.exit(1), 60000);
                } else {
                    console.log(chalk.yellow('[ ℹ️ ] Reintentando en 10 segundos...'));
                    setTimeout(() => process.exit(1), 10000);
                }
            }
        }, 5000); // Esperar 5 segundos para que la conexión se establezca
    }
}
conn.logger.info(`[ ℹ️ ] Cargando...\n`);
if (isCleanerEnabled()) runCleaner();
// Inicializar servicio de limpieza automática

startAutoCleanService();

if (!opts['test']) {
  if (global.db) {
    setInterval(async () => {
      if (global.db.data) await global.db.write();
      if (opts['autocleartmp'] && (global.support || {}).find) (tmp = [os.tmpdir(), 'tmp', 'jadibts'], tmp.forEach((filename) => cp.spawn('find', [filename, '-amin', '3', '-type', 'f', '-delete'])));
    }, 30 * 1000);
  }
}

if (opts['server']) (await import('./server.js')).default(global.conn, PORT);

async function clearTmp() {
  const tmp = [join('./src/tmp'), join('./temp')];
  try {
    for (const dirname of tmp) {
      if (!existsSync(dirname)) continue;
      
      const files = await readdir(dirname);
      await Promise.all(files.map(async file => {
        const filePath = join(dirname, file);
        const stats = await stat(filePath);
        
        // Reducir tiempo de retención a 30 minutos
        if (stats.isFile() && (Date.now() - stats.mtimeMs >= 1000 * 60 * 30)) {
          await unlink(filePath);
          secureLogger.info(`Archivo temporal eliminado: ${file}`);
        }
      }));
    }
  } catch (err) {
    secureLogger.error('Error en clearTmp:', err.message);
  }
}

// Limpieza automática de datos antiguos
if (privacyConfig.dataRetention.enabled) {
    setInterval(() => {
        if (stopped === 'close' || !global.conn || !global.conn?.user) return;
        cleanOldUserData();
    }, 1000 * 60 * 60 * 24); // Cada 24 horas
}

// Función para eliminar archivos core.<numero>
const dirToWatchccc = path.join(__dirname, './');
function deleteCoreFiles(filePath) {
  const coreFilePattern = /^core\.\d+$/i;
  const filename = path.basename(filePath);
  if (coreFilePattern.test(filename)) {
    fs.unlink(filePath, (err) => {
      if (err) {
        secureLogger.error(`Error eliminando el archivo ${filePath}:`, err);
      } else {
        secureLogger.info(`Archivo eliminado: ${filePath}`);
      }
    });
  }
}
fs.watch(dirToWatchccc, (eventType, filename) => {
  if (eventType === 'rename') {
    const filePath = path.join(dirToWatchccc, filename);
    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isFile()) {
        deleteCoreFiles(filePath);
      }
    });
  }
});

function runCleaner() {
  const cleaner = fork('./lib/cleaner.js');
  cleaner.on('message', msg => console.log('[cleaner]', msg));
  cleaner.on('exit', code => console.log(`[cleaner] terminó con código ${code}`));
}

let lastQR = null;
let codigoSolicitado = false;

async function connectionUpdate(update) {
  const { connection, lastDisconnect, isNewLogin, qr } = update;
  stopped = connection;
  if (isNewLogin) conn.isInit = true;

  const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode;
  if (code && code !== DisconnectReason.loggedOut && conn?.ws.socket == null) {
    await global.reloadHandler(true).catch(console.error);
    global.timestamp.connect = new Date;
  }
  if (global.db.data == null) loadDatabase();

  // Manejar QR solo si se seleccionó opción 1
  if (opcion === '1' && qr) {
    if (qr !== lastQR) {
      console.log(chalk.yellow('[ ℹ️ ] Escanea el código QR.'));
      lastQR = qr;
    }
  }

  // Manejar estados de conexión
  if (connection === 'open') {
    console.log(chalk.green('[ ✅ ] Conectado correctamente a WhatsApp'));
    console.log(chalk.green('[ ℹ️ ] Bot iniciado exitosamente'));
    codigoSolicitado = false;
  } else if (connection === 'connecting') {
    console.log(chalk.yellow('[ ℹ️ ] Conectando a WhatsApp...'));
  } else if (connection === 'close') {
    console.log(chalk.red('[ ❌ ] Conexión cerrada'));
  }

  let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
  if (reason == 405) {
    await fs.unlinkSync("./MichiBot/" + "creds.json");
    console.log(chalk.bold.redBright(`[ ⚠ ] Conexión reemplazada, Por favor espere un momento me voy a reiniciar...\nSi aparecen error vuelve a iniciar con : npm start`));
    process.send('reset');
  }

  if (connection === 'close') {
    if (reason === DisconnectReason.badSession) {
      conn.logger.error(`[ ⚠ ] Sesión incorrecta, por favor elimina la carpeta ${global.authFile} y escanea nuevamente.`);
    } else if (reason === DisconnectReason.connectionClosed) {
      conn.logger.warn(`[ ⚠ ] Conexión cerrada, reconectando en 2 segundos...`);
      setTimeout(async () => { await global.reloadHandler(true).catch(console.error); }, 2000);
    } else if (reason === DisconnectReason.connectionLost) {
      conn.logger.warn(`[ ⚠ ] Conexión perdida con el servidor, reconectando en 2 segundos...`);
      setTimeout(async () => { await global.reloadHandler(true).catch(console.error); }, 2000);
    } else if (reason === DisconnectReason.connectionReplaced) {
      conn.logger.error(`[ ⚠ ] Conexión reemplazada, se ha abierto otra nueva sesión. Por favor, cierra la sesión actual primero.`);
    } else if (reason === DisconnectReason.loggedOut) {
      conn.logger.error(`[ ⚠ ] Conexion cerrada, por favor elimina la carpeta ${global.authFile} y escanea nuevamente.`);
    } else if (reason === DisconnectReason.restartRequired) {
      conn.logger.info(`[ ⚠ ] Reinicio necesario, reinicie el servidor si presenta algún problema.`);
      await global.reloadHandler(true).catch(console.error);
    } else if (reason === DisconnectReason.timedOut) {
      conn.logger.warn(`[ ⚠ ] Tiempo de conexión agotado, reconectando en 2 segundos...`);
      setTimeout(async () => { await global.reloadHandler(true).catch(console.error); }, 2000);
    } else {
      conn.logger.warn(`[ ⚠ ] Razón de desconexión desconocida. ${reason || ''}: ${connection || ''}`);
      await global.reloadHandler(true).catch(console.error);
    }
  }
}

process.on('uncaughtException', console.error);

let isInit = true;

let handler = await import('./handler.js');
global.reloadHandler = async function(restatConn) {
  
  try {
    const Handler = await import(`./handler.js?update=${Date.now()}`).catch(console.error);
    if (Object.keys(Handler || {}).length) handler = Handler;
  } catch (e) {
    console.error(e);
  }
  if (restatConn) {
    const oldChats = global.conn.chats;
    try {
      global.conn.ws.close();
    } catch { }
    conn.ev.removeAllListeners();
    global.conn = makeWASocket(connectionOptions, {chats: oldChats});
    store?.bind(conn);
    isInit = true;
  }
  if (!isInit) {
    conn.ev.off('messages.upsert', conn.handler);
    conn.ev.off('group-participants.update', conn.participantsUpdate);
    conn.ev.off('groups.update', conn.groupsUpdate);
    conn.ev.off('message.delete', conn.onDelete);
    conn.ev.off('call', conn.onCall);
    conn.ev.off('connection.update', conn.connectionUpdate);
    conn.ev.off('creds.update', conn.credsUpdate);
  }

// Carga las configuraciones
const funcionesOwner = getOwnerFunction();

// Evento para manejar mensajes entrantes (antiprivado y modogrupos)
conn.ev.on('messages.upsert', async ({ messages }) => {
  if (!Array.isArray(messages)) return;
  const m = messages[0];
  if (!m.message || m.key?.remoteJid === 'status@broadcast') return;

  const isGroup = m.key.remoteJid.endsWith('@g.us');
  const sender = m.key.participant || m.key.remoteJid;

  // Función antiprivado
  if (funcionesOwner.antiprivado && !isGroup && !global.owner.includes(sender.split('@')[0])) {
    try {
      await conn.sendMessage(sender, { text: '🚫 *No puedo responder en chats privados.*' });
    } catch (e) {}
    return;
  }

  // Función modogrupos
  if (funcionesOwner.modogrupos && !isGroup) {
    try {
      await conn.sendMessage(sender, { text: '🚫 *Solo puedo responder en grupos.*' });
    } catch (e) {}
    return;
  }
});

  // Para cambiar estos mensajes, solo los archivos en la carpeta de language, 
  // busque la clave "handler" dentro del json y cámbiela si es necesario
  conn.welcome = '👋 ¡Bienvenido/a!\n@user';
  conn.bye = '👋 ¡Hasta luego!\n@user';
  conn.spromote = '*[ ℹ️ ] @user Fue promovido a administrador.*';
  conn.sdemote = '*[ ℹ️ ] @user Fue degradado de administrador.*';
  conn.sDesc = '*[ ℹ️ ] La descripción del grupo ha sido modificada.*';
  conn.sSubject = '*[ ℹ️ ] El nombre del grupo ha sido modificado.*';
  conn.sIcon = '*[ ℹ️ ] Se ha cambiado la foto de perfil del grupo.*';
  conn.sRevoke = '*[ ℹ️ ] El enlace de invitación al grupo ha sido restablecido.*';

  conn.handler = handler.handler.bind(global.conn);
  conn.participantsUpdate = handler.participantsUpdate.bind(global.conn);
  conn.groupsUpdate = handler.groupsUpdate.bind(global.conn);
  conn.onDelete = handler.deleteUpdate.bind(global.conn);
  conn.onCall = handler.callUpdate.bind(global.conn);
  conn.connectionUpdate = connectionUpdate.bind(global.conn);
  conn.credsUpdate = saveCreds.bind(global.conn, true);

  const currentDateTime = new Date();
  const messageDateTime = new Date(conn.ev);
  if (currentDateTime >= messageDateTime) {
    const chats = Object.entries(conn.chats).filter(([jid, chat]) => !jid.endsWith('@g.us') && chat.isChats).map((v) => v[0]);
  } else {
    const chats = Object.entries(conn.chats).filter(([jid, chat]) => !jid.endsWith('@g.us') && chat.isChats).map((v) => v[0]);
  }

conn.ev.on('messages.upsert', async (msg) => {
  try {
    await conn.handler(msg);
  } catch (err) {
    secureLogger.error('ERROR en handler de mensajes:', err);
  }
});
conn.ev.on('group-participants.update', conn.participantsUpdate);
conn.ev.on('groups.update', conn.groupsUpdate);
conn.ev.on('message.delete', conn.onDelete);
conn.ev.on('call', conn.onCall);
conn.ev.on('connection.update', conn.connectionUpdate);
conn.ev.on('creds.update', conn.credsUpdate);
isInit = false;
return true;
};

const pluginFolder = global.__dirname(join(__dirname, './plugins/index'));
const pluginFilter = (filename) => /\.js$/.test(filename);
global.plugins = {};
async function filesInit() {
  for (const filename of readdirSync(pluginFolder).filter(pluginFilter)) {
    try {
      const file = global.__filename(join(pluginFolder, filename));
      const module = await import(file);
      global.plugins[filename] = module.default || module;
    } catch (e) {
      conn.logger.error(e);
      delete global.plugins[filename];
    }
  }
}
filesInit().then((_) => Object.keys(global.plugins)).catch(console.error);

global.reload = async (_ev, filename) => {
  if (pluginFilter(filename)) {
    const dir = global.__filename(join(pluginFolder, filename), true);
    if (filename in global.plugins) {
      if (existsSync(dir)) conn.logger.info(` updated plugin - '${filename}'`);
      else {
        conn.logger.warn(`deleted plugin - '${filename}'`);
        return delete global.plugins[filename];
      }
    } else conn.logger.info(`new plugin - '${filename}'`);
    const err = syntaxerror(readFileSync(dir), filename, {
      sourceType: 'module',
      allowAwaitOutsideFunction: true,
    });
    if (err) conn.logger.error(`syntax error while loading '${filename}'\n${format(err)}`);
    else {
      try {
        const module = (await import(`${global.__filename(dir)}?update=${Date.now()}`));
        global.plugins[filename] = module.default || module;
      } catch (e) {
        conn.logger.error(`error require plugin '${filename}\n${format(e)}'`);
      } finally {
        global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)));
      }
    }
  }
};
Object.freeze(global.reload);
watch(pluginFolder, global.reload);
await global.reloadHandler();

async function _quickTest() {
  const test = await Promise.all([
    spawn('ffmpeg'),
    spawn('ffprobe'),
    spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-filter_complex', 'color', '-frames:v', '1', '-f', 'webp', '-']),
    spawn('convert'),
    spawn('magick'),
    spawn('gm'),
    spawn('find', ['--version']),
  ].map((p) => {
    return Promise.race([
      new Promise((resolve) => {
        p.on('close', (code) => {
          resolve(code !== 127);
        });
      }),
      new Promise((resolve) => {
        p.on('error', (_) => resolve(false));
      })]);
  }));
  const [ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find] = test;
  global.support = {ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find};
  Object.freeze(global.support);
}

setInterval(() => {
  if (stopped === 'close' || !global.conn || !global.conn?.user) return;
  clearTmp();
  if (privacyConfig.dataRetention.enabled) cleanOldUserData();
}, 1000 * 60 * 60 * 2); // Cada 2 horas

setInterval(() => {
  if (stopped === 'close' || !global.conn || !global.conn?.user) return;
  if (isCleanerEnabled()) runCleaner();
}, 1000 * 60 * 60 * 6);

setInterval(async () => {
  if (stopped === 'close' || !conn || !conn?.user) return;
  const _uptime = process.uptime() * 1000;
  const uptime = clockString(_uptime);
  const bio = `• Activo: ${uptime} | ${global.packname}`;
  await conn?.updateProfileStatus(bio).catch((_) => _);
}, 60000);

function clockString(ms) {
  const d = isNaN(ms) ? '--' : Math.floor(ms / 86400000);
  const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000) % 24;
  const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
  const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
  return [d, 'd ️', h, 'h ', m, 'm ', s, 's '].map((v) => v.toString().padStart(2, 0)).join('');
}

_quickTest().catch(console.error);
    process.on('uncaughtException', (err) => {
  secureLogger.error('🚨 Error inesperado no capturado');
  secureLogger.error('📄 Mensaje:', err?.message || err);
});

process.on('unhandledRejection', (reason, promise) => {
  secureLogger.warn('⚠️ Promesa rechazada sin manejar');
  secureLogger.warn('📄 Razón:', reason);
});
