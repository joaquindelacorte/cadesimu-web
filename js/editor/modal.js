/**
 * modal.js — Modal para asignar variable a un elemento
 */

export class VariableModal {
  constructor() {
    this._el = null;
    this._resolve = null;
    this._build();
  }

  _build() {
    this._el = document.createElement('div');
    this._el.id = 'var-modal';
    this._el.className = 'modal-overlay hidden';
    this._el.innerHTML = `
      <div class="modal-box">
        <h3 class="modal-title">Asignar variable</h3>
        <div class="modal-body">
          <div class="form-row">
            <label>Tipo</label>
            <select id="m-type">
              <option value="I">I — Entrada</option>
              <option value="Q">Q — Salida</option>
              <option value="M">M — Marca</option>
            </select>
          </div>
          <div class="form-row">
            <label>Dirección</label>
            <input id="m-addr" type="text" value="0" placeholder="0, 1, 2...">
          </div>
          <div class="modal-preview" id="m-preview">I.0</div>
        </div>
        <div class="modal-actions">
          <button class="btn" id="m-cancel">Cancelar</button>
          <button class="btn btn-play" id="m-ok">Aceptar</button>
        </div>
      </div>`;

    document.body.appendChild(this._el);

    const type = this._el.querySelector('#m-type');
    const addr = this._el.querySelector('#m-addr');
    const prev = this._el.querySelector('#m-preview');

    const updatePreview = () => { prev.textContent = `${type.value}.${addr.value}`; };
    type.addEventListener('change', updatePreview);
    addr.addEventListener('input', updatePreview);

    this._el.querySelector('#m-ok').addEventListener('click', () => this._confirm());
    this._el.querySelector('#m-cancel').addEventListener('click', () => this._cancel());
    this._el.addEventListener('click', e => { if (e.target === this._el) this._cancel(); });
  }

  /**
   * Abre el modal con los valores actuales del elemento.
   * @returns {Promise<{addrType, address}|null>}
   */
  open({ addrType = 'I', address = '0' } = {}) {
    this._el.querySelector('#m-type').value = addrType;
    this._el.querySelector('#m-addr').value = address;
    this._el.querySelector('#m-preview').textContent = `${addrType}.${address}`;
    this._el.classList.remove('hidden');
    this._el.querySelector('#m-addr').focus();

    return new Promise(res => { this._resolve = res; });
  }

  _confirm() {
    const addrType = this._el.querySelector('#m-type').value;
    const address  = this._el.querySelector('#m-addr').value.trim() || '0';
    this._close({ addrType, address });
  }

  _cancel() { this._close(null); }

  _close(val) {
    this._el.classList.add('hidden');
    this._resolve?.(val);
    this._resolve = null;
  }
}
