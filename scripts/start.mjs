import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const defaultPort = 58327;

// Check the page before reusing a port: another application must stay untouched.
export async function isOurSite(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1200), redirect: 'error' });
    if (!response.ok) return false;
    const html = await response.text();
    return /<title>АвтоПрокат\s*[—–-]/u.test(html) && html.includes('id="root"');
  } catch { return false; }
}

export async function findRunningSite(basePort = defaultPort) {
  const urls = Array.from({ length: 11 }, (_, i) => `http://127.0.0.1:${basePort + i}/`);
  const matches = await Promise.all(urls.map(isOurSite));
  return urls.find((url, i) => matches[i]) || null;
}

function openBrowser(url) {
  let executable, args;
  if (process.platform === 'win32') {
    executable = 'rundll32.exe';
    args = ['url.dll,FileProtocolHandler', url];
  } else if (process.platform === 'darwin') {
    executable = 'open'; args = [url];
  } else {
    executable = 'xdg-open'; args = [url];
  }
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: 'ignore', windowsHide: true });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Browser launcher exited: ${code}`)));
  });
}

export async function startSite({ port = defaultPort, open = true } = {}) {
  const existing = await findRunningSite(port);
  if (existing) {
    console.log(`Сайт уже работает: ${existing}`);
    if (open) await openBrowser(existing);
    return { reused: true, url: existing, server: null };
  }
  const { createServer } = await import('vite');
  const server = await createServer({
    root: projectRoot,
    server: { host: '127.0.0.1', port, strictPort: false, open: false },
  });
  try {
    await server.listen();
    const url = server.resolvedUrls.local[0];
    console.log(`Сайт запущен: ${url}`);
    console.log('Оставьте это окно открытым. Для остановки нажмите Ctrl + C.');
    if (open) {
      try { await openBrowser(url); }
      catch { console.log(`Не удалось открыть браузер автоматически. Откройте ${url}`); }
    }
    return { reused: false, url, server };
  } catch (error) {
    await server.close();
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    console.log(JSON.stringify({ runningSite: await findRunningSite() }));
  } else {
    try {
      const { server } = await startSite();
      if (server) {
        const stop = async () => { await server.close(); process.exit(0); };
        process.once('SIGINT', stop);
        process.once('SIGTERM', stop);
      }
    } catch (error) {
      console.error(`Не удалось запустить сайт: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
