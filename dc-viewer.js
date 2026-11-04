// Affiche un fichier .dc.html sans l'éditeur de maquettes : modèle + logique rendus avec React.
(function () {
  const h = React.createElement;
  const VOID = new Set(['input', 'br', 'hr', 'img', 'link', 'meta']);
  const ATTR = { class: 'className', for: 'htmlFor', onclick: 'onClick', onchange: 'onChange', inputmode: 'inputMode' };
  const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  function lookup(path, scope) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    return path.split('.').reduce((v, k) => (v == null ? v : v[k]), scope);
  }
  const WHOLE = /^\s*\{\{\s*([\w.$]+)\s*\}\}\s*$/;
  function value(text, scope) {
    const m = text.match(WHOLE);
    if (m) return lookup(m[1], scope);
    return text.replace(/\{\{\s*([\w.$]+)\s*\}\}/g, (_, p) => {
      const v = lookup(p, scope);
      return v == null ? '' : String(v);
    });
  }
  function styleObject(text) {
    const out = {};
    text.split(';').forEach((decl) => {
      const i = decl.indexOf(':');
      if (i < 0) return;
      const name = decl.slice(0, i).trim();
      out[name.startsWith('--') ? name : camel(name)] = decl.slice(i + 1).trim();
    });
    return out;
  }
  function kids(nodes, scope) {
    const out = [];
    nodes.forEach((n, i) => {
      const r = build(n, scope, i);
      if (r !== null) out.push(r);
    });
    return out;
  }
  function build(node, scope, key) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.textContent.trim()) return null;
      return value(node.textContent.replace(/\s+/g, ' '), scope);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    if (node.localName === 'template') {
      const inner = Array.from(node.content.childNodes);
      if (node.dataset.sc === 'if') {
        return value(node.getAttribute('value'), scope)
          ? h(React.Fragment, { key }, ...kids(inner, scope))
          : null;
      }
      const list = value(node.getAttribute('list'), scope) || [];
      const as = node.getAttribute('as');
      return h(React.Fragment, { key }, list.map((item, i) =>
        h(React.Fragment, { key: i }, ...kids(inner, { ...scope, [as]: item, $index: i }))));
    }

    const props = { key };
    Array.from(node.attributes).forEach(({ name, value: raw }) => {
      if (name.startsWith('hint-')) return;
      if (name === 'style') props.style = styleObject(value(raw, scope));
      else if (name.startsWith('aria-') || name.startsWith('data-')) props[name] = value(raw, scope);
      else props[ATTR[name] || camel(name)] = value(raw, scope);
    });
    const tag = node.localName;
    if (VOID.has(tag)) return h(tag, props);
    return h(tag, props, ...kids(Array.from(node.childNodes), scope));
  }

  window.mountDC = async function (file, target, props) {
    const res = await fetch(file, { cache: 'no-cache' });
    if (!res.ok) throw new Error('Fichier introuvable : ' + file);
    // <template> est admis partout, y compris dans <tbody>, contrairement à <sc-for>.
    const source = (await res.text())
      .replace(/<sc-if\b/g, '<template data-sc="if"').replace(/<\/sc-if>/g, '</template>')
      .replace(/<sc-for\b/g, '<template data-sc="for"').replace(/<\/sc-for>/g, '</template>');
    const doc = new DOMParser().parseFromString(source, 'text/html');
    const xdc = doc.querySelector('x-dc');
    const helmet = xdc.querySelector('helmet');
    Array.from(helmet.children).forEach((el) => document.head.appendChild(document.importNode(el, true)));
    const root = Array.from(xdc.children).find((el) => el !== helmet);
    const code = doc.querySelector('script[data-dc-script]').textContent;
    const Logic = new Function('DCLogic', code + '\nreturn Component;')(React.Component);
    class View extends Logic {
      render() { return build(root, this.renderVals(), 'root'); }
    }
    ReactDOM.createRoot(target).render(h(View, props || {}));
  };
})();
