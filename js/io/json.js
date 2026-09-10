/**
 * json.js — Export / Import de proyectos CADESIMU
 *
 * Schema .cadesimu.json v1:
 * {
 *   "version": "1",
 *   "meta": { "title", "author", "description", "created", "modified" },
 *   "variables": { "I": {}, "Q": {}, "M": {}, "T": {}, "C": {} },
 *   "rungs": [ { id, comment, elements: [...] } ]
 * }
 */

const CURRENT_VERSION = '1';

/**
 * Exporta el estado actual como objeto JSON.
 * @param {object} opts
 * @param {import('../engine/variables.js').VariableTable} opts.vars
 * @param {Array}  opts.rungs
 * @param {object} opts.meta  — { title, author, description }
 */
export function exportProject({ vars, rungs, meta = {} }) {
  return {
    version: CURRENT_VERSION,
    meta: {
      title:       meta.title       ?? 'Sin título',
      author:      meta.author      ?? '',
      description: meta.description ?? '',
      created:     meta.created     ?? new Date().toISOString(),
      modified:    new Date().toISOString(),
    },
    variables: vars.toJSON(),
    rungs:     JSON.parse(JSON.stringify(rungs)), // deep clone
  };
}

/**
 * Descarga el proyecto como archivo .cadesimu.json en el navegador.
 * @param {object} project — resultado de exportProject()
 * @param {string} [filename]
 */
export function downloadProject(project, filename) {
  const name = filename ?? `${project.meta.title.replace(/\s+/g, '_')}.cadesimu.json`;
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href     = url;
  a.download = name;
  a.click();

  // Liberar el object URL tras la descarga
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Valida y parsea un proyecto importado.
 * @param {string|object} raw — JSON string o objeto ya parseado
 * @returns {{ ok: boolean, project?: object, error?: string }}
 */
export function parseProject(raw) {
  try {
    const project = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (!project.version) {
      return { ok: false, error: 'Archivo sin campo "version". No es un proyecto CADESIMU válido.' };
    }
    if (project.version !== CURRENT_VERSION) {
      return { ok: false, error: `Versión ${project.version} no soportada. Se esperaba ${CURRENT_VERSION}.` };
    }
    if (!Array.isArray(project.rungs)) {
      return { ok: false, error: 'Campo "rungs" ausente o inválido.' };
    }

    return { ok: true, project };
  } catch (e) {
    return { ok: false, error: `JSON inválido: ${e.message}` };
  }
}

/**
 * Abre el file picker del navegador y devuelve el proyecto parseado.
 * @returns {Promise<{ ok: boolean, project?: object, error?: string }>}
 */
export function importProjectFromFile() {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = '.cadesimu.json,application/json';

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve({ ok: false, error: 'No se seleccionó archivo.' });

      const reader = new FileReader();
      reader.onload = e => resolve(parseProject(e.target.result));
      reader.onerror = () => resolve({ ok: false, error: 'Error al leer el archivo.' });
      reader.readAsText(file);
    };

    input.click();
  });
}
