/* @ds-bundle: {"format":4,"namespace":"KolaMatchDesignSystem_90cf52","components":[{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"Divider","sourcePath":"components/core/Divider.jsx"},{"name":"MatchIndicator","sourcePath":"components/core/MatchIndicator.jsx"},{"name":"Tooltip","sourcePath":"components/core/Tooltip.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"OptionRow","sourcePath":"components/forms/OptionRow.jsx"}],"sourceHashes":{"components/core/Card.jsx":"6b5305d7fbfe","components/core/Chip.jsx":"efe4aacd6a2d","components/core/Divider.jsx":"07dc644234ec","components/core/MatchIndicator.jsx":"93279c23c9d1","components/core/Tooltip.jsx":"03956785a786","components/forms/Button.jsx":"f6139c254264","components/forms/Checkbox.jsx":"9d9e595ee862","components/forms/Input.jsx":"f6730fe923be","components/forms/OptionRow.jsx":"f3c7b7e00800","ui_kits/skolamatch/Landing.jsx":"6935a37d7b57","ui_kits/skolamatch/Paywall.jsx":"dacdf146c894","ui_kits/skolamatch/Questionnaire.jsx":"7f9b3e24a84b","ui_kits/skolamatch/Results.jsx":"677b2b18df74","ui_kits/skolamatch/SchoolDetail.jsx":"04f915620821","ui_kits/skolamatch/Search.jsx":"143a84e7c25f","ui_kits/skolamatch/Shell.jsx":"833f02b8cf47"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.KolaMatchDesignSystem_90cf52 = window.KolaMatchDesignSystem_90cf52 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  as: Tag = 'div',
  raised = true,
  padding = 'var(--space-lg)',
  interactive = false,
  style,
  children,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement(Tag, _extends({
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-card)',
      padding,
      boxShadow: raised ? 'var(--shadow-card)' : 'none',
      border: raised ? 'none' : 'var(--border-width) solid var(--border)',
      transform: interactive && hover ? 'translateY(-1px)' : 'none',
      transition: 'transform var(--dur-state) var(--ease-out), box-shadow var(--dur-state) var(--ease-out)',
      cursor: interactive ? 'pointer' : undefined,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Chip.jsx
try { (() => {
function Chip({
  children,
  icon,
  onRemove,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      background: 'var(--neutral)',
      color: 'var(--secondary)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--fs-data-sm)',
      fontWeight: 500,
      lineHeight: 'var(--lh-data-sm)',
      fontFeatureSettings: "'tnum' 1",
      borderRadius: 'var(--radius-chip)',
      padding: '5px 10px',
      ...style
    }
  }, icon, children, onRemove && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onRemove,
    "aria-label": "Odebrat",
    style: {
      display: 'flex',
      border: 0,
      background: 'transparent',
      padding: 0,
      marginLeft: 2,
      cursor: 'pointer',
      color: 'inherit'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 6l12 12M18 6 6 18"
  }))));
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Chip.jsx", error: String((e && e.message) || e) }); }

// components/core/Divider.jsx
try { (() => {
function Divider({
  strong = false,
  vertical = false,
  spacing = 'var(--space-md)',
  style
}) {
  const color = strong ? 'var(--border-strong)' : 'var(--border)';
  return /*#__PURE__*/React.createElement("div", {
    role: "separator",
    "aria-orientation": vertical ? 'vertical' : 'horizontal',
    style: vertical ? {
      width: 1,
      alignSelf: 'stretch',
      background: color,
      margin: '0 ' + spacing,
      ...style
    } : {
      height: 1,
      width: '100%',
      background: color,
      margin: spacing + ' 0',
      ...style
    }
  });
}
Object.assign(__ds_scope, { Divider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Divider.jsx", error: String((e && e.message) || e) }); }

// components/core/MatchIndicator.jsx
try { (() => {
const tick = /*#__PURE__*/React.createElement("svg", {
  width: "12",
  height: "12",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "3",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M20 6.5 9.5 17.5 4.5 12.5"
}));
const dash = /*#__PURE__*/React.createElement("svg", {
  width: "12",
  height: "12",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "3",
  strokeLinecap: "round",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M6 12h12"
}));

/* Criteria the student supplied, reflected back — never a headline score, never a
   verdict on the person. Every string is about the school. */
function MatchIndicator({
  label,
  criteria = [],
  style
}) {
  const met = criteria.filter(c => c.met !== false).length;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-sm)',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      alignSelf: 'flex-start',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      background: 'var(--tertiary-subtle)',
      color: 'var(--tertiary)',
      borderRadius: 'var(--radius-full)',
      padding: '5px 12px',
      fontSize: 'var(--fs-label-caps)',
      fontWeight: 600,
      letterSpacing: 'var(--ls-label-caps)',
      textTransform: 'uppercase'
    }
  }, tick, label || 'Splňuje ' + met + ' z ' + criteria.length + ' vašich kritérií'), criteria.length > 0 && /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-xs)'
    }
  }, criteria.map((c, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-sm)',
      fontSize: 'var(--fs-body-sm)',
      lineHeight: 'var(--lh-body-sm)',
      color: c.met === false ? 'var(--text-faint)' : 'var(--text-body)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 3,
      color: c.met === false ? 'var(--on-surface-faint)' : 'var(--tertiary)'
    }
  }, c.met === false ? dash : tick), /*#__PURE__*/React.createElement("span", null, c.text)))));
}
Object.assign(__ds_scope, { MatchIndicator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/MatchIndicator.jsx", error: String((e && e.message) || e) }); }

// components/core/Tooltip.jsx
try { (() => {
/* Optional supplementary detail ONLY. Anything that changes what a student should
   conclude about a school belongs inline, in the same viewport as the fact. */
function Tooltip({
  content,
  placement = 'top',
  children,
  style
}) {
  const [open, setOpen] = React.useState(false);
  const pos = placement === 'bottom' ? {
    top: 'calc(100% + 8px)',
    left: '50%',
    transform: 'translateX(-50%)'
  } : {
    bottom: 'calc(100% + 8px)',
    left: '50%',
    transform: 'translateX(-50%)'
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      ...style
    },
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
    tabIndex: 0
  }, children, open && /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: 'absolute',
      ...pos,
      zIndex: 20,
      width: 'max-content',
      maxWidth: 260,
      background: 'var(--on-surface)',
      color: 'var(--surface)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--fs-body-sm)',
      lineHeight: 'var(--lh-body-sm)',
      borderRadius: 'var(--radius-input)',
      padding: 'var(--space-sm) 10px',
      boxShadow: 'var(--shadow-overlay)'
    }
  }, content));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const base = {
  fontFamily: 'var(--font-sans)',
  fontWeight: 600,
  lineHeight: 1,
  borderRadius: 'var(--radius-button)',
  border: 'var(--border-width) solid transparent',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-sm)',
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'background-color var(--dur-state) var(--ease-out), color var(--dur-state) var(--ease-out), border-color var(--dur-state) var(--ease-out)'
};
const sizes = {
  sm: {
    fontSize: 'var(--fs-body-sm)',
    padding: '8px 14px'
  },
  md: {
    fontSize: 'var(--fs-label-md)',
    padding: '13px var(--space-md)'
  },
  lg: {
    fontSize: 'var(--fs-body-lg)',
    padding: '16px var(--space-lg)'
  }
};
function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  style,
  children,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const isPrimary = variant === 'primary';
  const skin = isPrimary ? {
    background: hover && !disabled ? 'var(--primary-strong)' : 'var(--primary)',
    color: 'var(--text-on-primary)'
  } : {
    background: hover && !disabled ? 'var(--neutral)' : 'var(--surface)',
    color: hover && !disabled ? 'var(--primary-strong)' : 'var(--primary)',
    borderColor: hover && !disabled ? 'var(--border-strong)' : 'transparent'
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      ...base,
      ...sizes[size],
      ...skin,
      width: fullWidth ? '100%' : undefined,
      opacity: disabled ? 0.45 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...style
    }
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  label,
  checked = false,
  disabled = false,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-sm)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--fs-body-md)',
      color: 'var(--text-body)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: checked,
    disabled: disabled,
    onChange: e => onChange && onChange(e.target.checked, e),
    style: {
      position: 'absolute',
      opacity: 0,
      width: 22,
      height: 22,
      margin: 0,
      cursor: 'inherit'
    }
  }), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 22,
      height: 22,
      flex: '0 0 auto',
      borderRadius: 'var(--radius-input)',
      background: checked ? 'var(--primary)' : 'var(--surface)',
      border: checked ? 'none' : 'var(--border-width-active) solid var(--border-strong)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background-color var(--dur-state) var(--ease-out)'
    }
  }, checked && /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--surface)",
    strokeWidth: "3.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6.5 9.5 17.5 4.5 12.5"
  }))), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  hint,
  error,
  icon,
  value,
  placeholder,
  id,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const invalid = Boolean(error);
  const inputId = id || React.useId();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-xs)',
      fontFamily: 'var(--font-sans)'
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontSize: 'var(--fs-label-md)',
      fontWeight: 600,
      color: 'var(--text-body)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-sm)',
      background: invalid ? 'var(--error-subtle)' : 'var(--surface-input)',
      border: focus || invalid ? 'var(--border-width-active) solid ' + (invalid ? 'var(--error)' : 'var(--primary)') : 'var(--border-width) solid var(--border)',
      borderRadius: 'var(--radius-input)',
      padding: focus || invalid ? '9.5px 11.5px' : '10px 12px',
      ...style
    }
  }, icon, /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    value: value,
    placeholder: placeholder,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--fs-body-md)',
      lineHeight: 'var(--lh-body-md)',
      color: invalid ? 'var(--error)' : 'var(--text-body)'
    }
  }, rest))), invalid && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      color: 'var(--error)',
      fontSize: 'var(--fs-body-sm)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8v4.5M12 16h.01"
  })), /*#__PURE__*/React.createElement("span", null, error)), !invalid && hint && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-faint)',
      fontSize: 'var(--fs-caption)'
    }
  }, hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/OptionRow.jsx
try { (() => {
function OptionRow({
  label,
  description,
  selected = false,
  multiple = false,
  onSelect,
  style,
  children
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    role: multiple ? 'checkbox' : 'radio',
    "aria-checked": selected,
    tabIndex: 0,
    onClick: onSelect,
    onKeyDown: e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect && onSelect(e);
      }
    },
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-md)',
      cursor: 'pointer',
      background: selected ? 'var(--primary-subtle)' : hover ? 'var(--neutral)' : 'var(--surface)',
      border: selected ? 'var(--border-width-active) solid var(--primary)' : 'var(--border-width) solid var(--border)',
      borderRadius: 'var(--radius-input)',
      padding: selected ? '15.5px' : 'var(--space-md)',
      transition: 'background-color var(--dur-state) var(--ease-out)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      flex: '0 0 auto',
      width: 22,
      height: 22,
      marginTop: 1,
      borderRadius: multiple ? 'var(--radius-input)' : 'var(--radius-full)',
      background: selected ? 'var(--primary)' : 'var(--surface)',
      border: selected ? 'none' : 'var(--border-width-active) solid var(--border-strong)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, selected && (multiple ? /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--surface)",
    strokeWidth: "3.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6.5 9.5 17.5 4.5 12.5"
  })) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'var(--surface)'
    }
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0,
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 'var(--fs-body-md)',
      lineHeight: 'var(--lh-body-md)',
      color: 'var(--text-body)',
      fontWeight: selected ? 600 : 400
    }
  }, label), description && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginTop: 2,
      fontSize: 'var(--fs-body-sm)',
      lineHeight: 'var(--lh-body-sm)',
      color: 'var(--text-muted)'
    }
  }, description), children));
}
Object.assign(__ds_scope, { OptionRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/OptionRow.jsx", error: String((e && e.message) || e) }); }

// ui_kits/skolamatch/Landing.jsx
try { (() => {
const {
  Button,
  Card,
  Divider
} = window.KolaMatchDesignSystem_90cf52;
function Landing({
  go
}) {
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement(Page, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '7fr 5fr',
      gap: 'var(--space-xxxl)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "sm-label-caps",
    style: {
      color: 'var(--secondary)'
    }
  }, "Pro dev\xE1\u0165\xE1ky a jejich rodi\u010De"), /*#__PURE__*/React.createElement("h1", {
    className: "sm-display",
    style: {
      marginTop: 'var(--space-md)',
      maxWidth: '14ch'
    }
  }, "Vyber si \u0161kolu podle sebe"), /*#__PURE__*/React.createElement("p", {
    className: "sm-body-lg",
    style: {
      marginTop: 'var(--space-lg)',
      color: 'var(--secondary)'
    }
  }, "Odpov\xED\u0161 na dvacet ot\xE1zek o tom, co t\u011B zaj\xEDm\xE1, kam dojede\u0161 a jak se ti u\u010D\xED. Pak uvid\xED\u0161 \u0161koly, kter\xE9 tomu odpov\xEDdaj\xED \u2014 a u ka\u017Ed\xE9 napsan\xE9, \u010D\xEDm konkr\xE9tn\u011B."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-md)',
      marginTop: 'var(--space-xl)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    onClick: () => go('quiz')
  }, "Za\u010D\xEDt dotazn\xEDk"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "secondary",
    onClick: () => go('search')
  }, "Prohl\xE9dnout datab\xE1zi \u0161kol")), /*#__PURE__*/React.createElement("p", {
    className: "sm-caption",
    style: {
      marginTop: 'var(--space-md)'
    }
  }, "Dotazn\xEDk je zdarma. Plat\xED se a\u017E za podrobn\xE9 srovn\xE1n\xED.")), /*#__PURE__*/React.createElement(PhotoSlot, {
    height: 380
  })), /*#__PURE__*/React.createElement(Divider, {
    strong: true,
    spacing: "var(--space-xxl)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 'var(--gutter)'
    }
  }, [['Podle tvých kritérií', 'U každé školy je napsané, které z věcí, co jsi označil jako důležité, škola nabízí — a které ne.'], ['Čísla se zdrojem', 'Hranice přijetí, počet míst a obory pocházejí z veřejných rejstříků. U každého čísla je rok.'], ['Beze skóre', 'Nedáváme školám známky ani ti neříkáme, jak dobrý jsi kandidát. Ukazujeme fakta a jak sedí k tomu, co jsi napsal.']].map(([h, b]) => /*#__PURE__*/React.createElement(Card, {
    key: h
  }, /*#__PURE__*/React.createElement("h3", {
    className: "sm-headline-sm",
    style: {
      margin: 0
    }
  }, h), /*#__PURE__*/React.createElement("p", {
    className: "sm-body-sm",
    style: {
      marginTop: 'var(--space-sm)',
      color: 'var(--secondary)'
    }
  }, b))))), /*#__PURE__*/React.createElement(Footer, null));
}
Object.assign(window, {
  Landing
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/skolamatch/Landing.jsx", error: String((e && e.message) || e) }); }

// ui_kits/skolamatch/Paywall.jsx
try { (() => {
const {
  Card,
  Button,
  Input,
  Checkbox,
  Divider
} = window.KolaMatchDesignSystem_90cf52;
function Paywall({
  go
}) {
  const [email, setEmail] = React.useState('');
  const [terms, setTerms] = React.useState(false);
  const [tried, setTried] = React.useState(false);
  const bad = tried && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email);
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 980,
      margin: '0 auto',
      padding: 'var(--space-xxl) var(--page-margin)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 400px',
      gap: 'var(--space-xxxl)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "sm-headline-lg"
  }, "Podrobn\xE9 srovn\xE1n\xED"), /*#__PURE__*/React.createElement("p", {
    className: "sm-body-lg",
    style: {
      marginTop: 'var(--space-md)',
      color: 'var(--secondary)'
    }
  }, "Dotazn\xEDk a seznam shod z\u016Fst\xE1vaj\xED zdarma. Plat\xED se za srovn\xE1vac\xED tabulku v\u0161ech \u0161kol, historii hranic p\u0159ijet\xED a odhad podle pr\u016Fm\u011Bru na vysv\u011Bd\u010Den\xED."), /*#__PURE__*/React.createElement(Divider, {
    spacing: "var(--space-lg)"
  }), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-sm)'
    }
  }, ['Všech 17 shod, ne jen prvních tři', 'Srovnávací tabulka až pěti škol vedle sebe', 'Hranice přijetí za roky 2021–2025 u každého oboru', 'Termíny DiPSy a podklady k přihlášce v PDF', 'Přístup pro rodiče na stejný účet'].map(t => /*#__PURE__*/React.createElement("li", {
    key: t,
    style: {
      display: 'flex',
      gap: 'var(--space-sm)',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--tertiary)",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      marginTop: 4,
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6.5 9.5 17.5 4.5 12.5"
  })), /*#__PURE__*/React.createElement("span", {
    className: "sm-body-md"
  }, t))))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 'var(--space-sm)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "sm-headline-md",
    style: {
      fontFamily: 'var(--font-serif-display)'
    }
  }, "390 K\u010D"), /*#__PURE__*/React.createElement("span", {
    className: "sm-caption"
  }, "jednor\xE1zov\u011B, bez obnoven\xED")), /*#__PURE__*/React.createElement(Divider, {
    spacing: "var(--space-md)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-md)'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "E-mail rodi\u010De",
    placeholder: "jmeno@email.cz",
    value: email,
    onChange: e => setEmail(e.target.value),
    error: bad ? 'Zkontrolujte prosím tvar e-mailové adresy.' : undefined,
    hint: "Na tuto adresu po\u0161leme p\u0159\xEDstup ke srovn\xE1n\xED."
  }), /*#__PURE__*/React.createElement(Checkbox, {
    label: "Souhlas\xEDm s podm\xEDnkami slu\u017Eby",
    checked: terms,
    onChange: setTerms
  }), /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    size: "lg",
    disabled: !terms,
    onClick: () => setTried(true)
  }, "Zaplatit 390 K\u010D"), /*#__PURE__*/React.createElement("p", {
    className: "sm-caption"
  }, "Platba p\u0159es Stripe. Do 14 dn\u016F vrac\xEDme pen\xEDze bez uveden\xED d\u016Fvodu.")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-xl)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: () => go('results')
  }, "Zp\u011Bt na shody"))), /*#__PURE__*/React.createElement(Footer, null));
}
Object.assign(window, {
  Paywall
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/skolamatch/Paywall.jsx", error: String((e && e.message) || e) }); }

// ui_kits/skolamatch/Questionnaire.jsx
try { (() => {
const {
  Button,
  OptionRow,
  Divider
} = window.KolaMatchDesignSystem_90cf52;
const QUESTIONS = [{
  q: 'Co bys na střední chtěl dělat nejvíc?',
  multiple: false,
  options: [['Programovat a pracovat s technikou', 'Vede na IT a technické obory'], ['Pracovat s lidmi', 'Vede na zdravotnické a pedagogické obory'], ['Zatím nevím', 'Ukážeme ti hlavně všeobecné gymnázium']]
}, {
  q: 'Co je pro tebe u školy důležité? Vyber klidně víc věcí.',
  multiple: true,
  options: [['Dojezd do 30 minut', null], ['Silná výuka matematiky', null], ['Možnost jazykové zkoušky', null], ['Malé třídy', null]]
}, {
  q: 'Jaký máš průměr na posledním vysvědčení?',
  multiple: false,
  options: [['1,0 – 1,5', null], ['1,6 – 2,2', null], ['2,3 a výš', null]]
}];
function Questionnaire({
  go
}) {
  const [step, setStep] = React.useState(0);
  const [picks, setPicks] = React.useState({});
  const item = QUESTIONS[step];
  const chosen = picks[step] || [];
  const toggle = label => setPicks({
    ...picks,
    [step]: item.multiple ? chosen.includes(label) ? chosen.filter(x => x !== label) : [...chosen, label] : [label]
  });
  const last = step === QUESTIONS.length - 1;
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 760,
      margin: '0 auto',
      padding: 'var(--space-xxl) var(--page-margin)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-md)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "sm-label-caps",
    style: {
      background: 'var(--neutral)',
      color: 'var(--secondary)',
      borderRadius: 'var(--radius-full)',
      padding: '5px 12px'
    }
  }, "Ot\xE1zka ", step + 1, " z ", QUESTIONS.length), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 6,
      borderRadius: 'var(--radius-full)',
      background: 'var(--neutral)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: (step + 1) / QUESTIONS.length * 100 + '%',
      height: '100%',
      borderRadius: 'var(--radius-full)',
      background: 'var(--primary)'
    }
  }))), /*#__PURE__*/React.createElement("h1", {
    className: "sm-headline-lg",
    style: {
      marginTop: 'var(--space-xl)'
    }
  }, item.q), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-sm)',
      marginTop: 'var(--space-lg)'
    }
  }, item.options.map(([label, desc]) => /*#__PURE__*/React.createElement(OptionRow, {
    key: label,
    label: label,
    description: desc,
    multiple: item.multiple,
    selected: chosen.includes(label),
    onSelect: () => toggle(label)
  }))), /*#__PURE__*/React.createElement(Divider, {
    spacing: "var(--space-xl)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: () => step === 0 ? go('landing') : setStep(step - 1)
  }, "Zp\u011Bt"), /*#__PURE__*/React.createElement(Button, {
    disabled: chosen.length === 0,
    onClick: () => last ? go('results') : setStep(step + 1)
  }, last ? 'Zobrazit výsledky' : 'Pokračovat'))));
}
Object.assign(window, {
  Questionnaire
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/skolamatch/Questionnaire.jsx", error: String((e && e.message) || e) }); }

// ui_kits/skolamatch/Results.jsx
try { (() => {
const {
  Card,
  Chip,
  Divider,
  MatchIndicator,
  Button
} = window.KolaMatchDesignSystem_90cf52;
const MATCHES = [{
  name: 'Smíchovská SPŠ a gymnázium',
  meta: ['Praha 5', 'státní', 'Informatika'],
  cut: '44,0',
  criteria: [{
    text: 'Nabízí IT zaměření, které jsi označil jako důležité'
  }, {
    text: 'Dojezd 22 minut z tvé adresy'
  }, {
    text: 'Otevírá 120 míst, o 8 více než v roce 2025'
  }]
}, {
  name: 'SPŠ elektrotechnická Ječná',
  meta: ['Praha 2', 'státní', 'Informatika'],
  cut: '41,0',
  criteria: [{
    text: 'Nabízí IT zaměření, které jsi označil jako důležité'
  }, {
    text: 'Loňská hranice přijetí 41,0 bodu'
  }, {
    text: 'Dojezd 41 minut — víc než 30 minut, které jsi zadal',
    met: false
  }]
}, {
  name: 'Gymnázium Na Zatlance',
  meta: ['Praha 5', 'státní', 'Všeobecné'],
  cut: '49,0',
  criteria: [{
    text: 'Dojezd 17 minut z tvé adresy'
  }, {
    text: 'Silná výuka matematiky — čtyři hodiny týdně ve všech ročnících'
  }, {
    text: 'Nemá samostatný IT obor',
    met: false
  }]
}];
function Results({
  go
}) {
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement(Page, null, /*#__PURE__*/React.createElement("h1", {
    className: "sm-headline-lg"
  }, "\u0160koly, kter\xE9 odpov\xEDdaj\xED tv\xFDm odpov\u011Bd\xEDm"), /*#__PURE__*/React.createElement("p", {
    className: "sm-body-md",
    style: {
      marginTop: 'var(--space-sm)',
      color: 'var(--secondary)'
    }
  }, "\u0158azeno podle toho, kolik z tv\xFDch krit\xE9ri\xED \u0161kola spl\u0148uje. U ka\u017Ed\xE9 je napsan\xE9 kter\xE9. \u010C\xEDsla poch\xE1zej\xED z p\u0159ij\xEDmac\xEDho \u0159\xEDzen\xED 2025."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-md)',
      marginTop: 'var(--space-xl)'
    }
  }, MATCHES.map(m => /*#__PURE__*/React.createElement(Card, {
    key: m.name,
    interactive: true,
    onClick: () => go('detail')
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 320px',
      gap: 'var(--space-xxl)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "sm-headline-sm",
    style: {
      margin: 0
    }
  }, m.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '6px',
      marginTop: 'var(--space-sm)'
    }
  }, m.meta.map(t => /*#__PURE__*/React.createElement(Chip, {
    key: t
  }, t))), /*#__PURE__*/React.createElement(Divider, {
    spacing: "var(--space-md)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-xl)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sm-caption"
  }, "Hranice p\u0159ijet\xED 2025"), /*#__PURE__*/React.createElement("div", {
    className: "sm-data-md"
  }, m.cut, " bodu")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sm-caption"
  }, "P\u0159ijato z p\u0159ihl\xE1\u0161en\xFDch"), /*#__PURE__*/React.createElement("div", {
    className: "sm-data-md"
  }, "120 / 287")))), /*#__PURE__*/React.createElement(MatchIndicator, {
    criteria: m.criteria
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-xl)',
      display: 'flex',
      gap: 'var(--space-md)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: () => go('paywall')
  }, "Odemknout podrobn\xE9 srovn\xE1n\xED"), /*#__PURE__*/React.createElement("span", {
    className: "sm-caption"
  }, "Zbyl\xFDch 14 shod, srovn\xE1vac\xED tabulka a odhad podle tv\xE9ho pr\u016Fm\u011Bru."))), /*#__PURE__*/React.createElement(Footer, null));
}
Object.assign(window, {
  Results
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/skolamatch/Results.jsx", error: String((e && e.message) || e) }); }

// ui_kits/skolamatch/SchoolDetail.jsx
try { (() => {
const {
  Card,
  Chip,
  Divider,
  MatchIndicator,
  Tooltip,
  Button
} = window.KolaMatchDesignSystem_90cf52;
function Row({
  label,
  value,
  note
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      padding: 'var(--row-pad-dense) 0',
      borderBottom: '1px solid var(--border)',
      gap: 'var(--space-lg)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "sm-body-sm",
    style: {
      color: 'var(--secondary)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "sm-data-md"
  }, value), note && /*#__PURE__*/React.createElement("span", {
    className: "sm-caption",
    style: {
      display: 'block'
    }
  }, note)));
}
function SchoolDetail({
  go
}) {
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement(Page, null, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      go('results');
    },
    className: "sm-body-sm"
  }, "\u2190 Zp\u011Bt na shody"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 380px',
      gap: 'var(--space-xxxl)',
      marginTop: 'var(--space-md)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "sm-headline-lg"
  }, "Sm\xEDchovsk\xE1 SP\u0160 a gymn\xE1zium"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '6px',
      marginTop: 'var(--space-md)'
    }
  }, ['Praha 5', 'státní', '4 roky', 'Informatika', 'Preslova 25'].map(t => /*#__PURE__*/React.createElement(Chip, {
    key: t
  }, t))), /*#__PURE__*/React.createElement("p", {
    className: "sm-body-md",
    style: {
      marginTop: 'var(--space-lg)'
    }
  }, "\u0160kola nab\xEDz\xED dva maturitn\xED obory se zam\u011B\u0159en\xEDm na informa\u010Dn\xED technologie a jeden v\u0161eobecn\xFD gymnazi\xE1ln\xED program. V\xFDuka programov\xE1n\xED za\u010D\xEDn\xE1 v prvn\xEDm ro\u010Dn\xEDku."), /*#__PURE__*/React.createElement(PhotoSlot, {
    height: 260,
    label: "Fotografie \u0161koly \xB7 dod\xE1 redakce"
  }), /*#__PURE__*/React.createElement("h2", {
    className: "sm-headline-md",
    style: {
      marginTop: 'var(--space-xl)'
    }
  }, "P\u0159ij\xEDmac\xED \u0159\xEDzen\xED"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-md)'
    }
  }, /*#__PURE__*/React.createElement(Row, {
    label: "Hranice p\u0159ijet\xED 2025",
    value: "44,0 bodu",
    note: "ze 100 bod\u016F jednotn\xE9 zkou\u0161ky"
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Hranice p\u0159ijet\xED 2024",
    value: "41,5 bodu"
  }), /*#__PURE__*/React.createElement(Row, {
    label: "P\u0159ijato z p\u0159ihl\xE1\u0161en\xFDch",
    value: "120 / 287"
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Po\u010Det m\xEDst 2026",
    value: "120",
    note: "o 8 v\xEDce ne\u017E v roce 2025"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: 'var(--row-pad-dense) 0'
    }
  }, /*#__PURE__*/React.createElement(Tooltip, {
    content: "DiPSy \u2014 digit\xE1ln\xED p\u0159ihla\u0161ovac\xED syst\xE9m pro st\u0159edn\xED \u0161koly, spravovan\xFD M\u0160MT."
  }, /*#__PURE__*/React.createElement("span", {
    className: "sm-body-sm",
    style: {
      color: 'var(--secondary)',
      borderBottom: '1px dashed var(--border-strong)'
    }
  }, "P\u0159ihl\xE1\u0161ky p\u0159es DiPSy")), /*#__PURE__*/React.createElement("span", {
    className: "sm-data-md"
  }, "1.\u201320. 2. 2026"))), /*#__PURE__*/React.createElement("p", {
    className: "sm-body-sm",
    style: {
      marginTop: 'var(--space-md)',
      color: 'var(--secondary)'
    }
  }, "Hranice p\u0159ijet\xED se rok od roku m\u011Bn\xED podle toho, kolik lid\xED se p\u0159ihl\xE1s\xED a jak dopadne zkou\u0161ka \u2014 \u010D\xEDslo z roku 2025 je vod\xEDtko, ne podm\xEDnka.")), /*#__PURE__*/React.createElement("aside", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-md)'
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(MatchIndicator, {
    criteria: [{
      text: 'Nabízí IT zaměření, které jsi označil jako důležité'
    }, {
      text: 'Dojezd 22 minut z tvé adresy'
    }, {
      text: 'Otevírá 120 míst, o 8 více než v roce 2025'
    }, {
      text: 'Malé třídy jsi označil jako důležité; průměrná třída má 30 žáků',
      met: false
    }]
  }), /*#__PURE__*/React.createElement(Divider, {
    spacing: "var(--space-md)"
  }), /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    onClick: () => go('paywall')
  }, "P\u0159idat do srovn\xE1n\xED")), /*#__PURE__*/React.createElement(Card, {
    raised: false
  }, /*#__PURE__*/React.createElement("p", {
    className: "sm-label-caps",
    style: {
      color: 'var(--on-surface-faint)'
    }
  }, "Zdroje"), /*#__PURE__*/React.createElement("p", {
    className: "sm-body-sm",
    style: {
      marginTop: 'var(--space-sm)',
      color: 'var(--secondary)'
    }
  }, "Rejst\u0159\xEDk \u0161kol M\u0160MT (2026-01) \xB7 v\xFDsledky jednotn\xE9 p\u0159ij\xEDmac\xED zkou\u0161ky CERMAT (2024, 2025) \xB7 webov\xE9 str\xE1nky \u0161koly."))))), /*#__PURE__*/React.createElement(Footer, null));
}
Object.assign(window, {
  SchoolDetail
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/skolamatch/SchoolDetail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/skolamatch/Search.jsx
try { (() => {
const {
  Input,
  Checkbox,
  Chip,
  Divider,
  Button
} = window.KolaMatchDesignSystem_90cf52;
const SCHOOLS = [['Gymnázium Jana Nerudy', 'Praha 5 · státní · 4 roky', 'Všeobecné', 60, '54,5'], ['SPŠ elektrotechnická Ječná', 'Praha 2 · státní · 4 roky', 'Informatika', 90, '41,0'], ['Lyceum Bohemia', 'Praha 9 · soukromé · 4 roky', 'Ekonomika', 48, '38,5'], ['Gymnázium Na Zatlance', 'Praha 5 · státní · 4 roky', 'Všeobecné', 90, '49,0'], ['SOŠ zdravotnická Alšovo nábř.', 'Praha 1 · státní · 4 roky', 'Zdravotnictví', 64, '35,5'], ['Smíchovská SPŠ a gymnázium', 'Praha 5 · státní · 4 roky', 'Informatika', 120, '44,0'], ['Gymnázium Budějovická', 'Praha 4 · státní · 8 let', 'Všeobecné', 30, '57,5']];
const searchIcon = /*#__PURE__*/React.createElement("svg", {
  width: "17",
  height: "17",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "var(--on-surface-faint)",
  strokeWidth: "2.2",
  strokeLinecap: "round"
}, /*#__PURE__*/React.createElement("circle", {
  cx: "11",
  cy: "11",
  r: "7"
}), /*#__PURE__*/React.createElement("path", {
  d: "m20 20-3.6-3.6"
}));
function Search({
  go
}) {
  const [q, setQ] = React.useState('');
  const [pub, setPub] = React.useState(true);
  const [filters, setFilters] = React.useState(['Praha', 'Do 30 km']);
  const rows = SCHOOLS.filter(s => s[0].toLowerCase().includes(q.toLowerCase()));
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement(Page, null, /*#__PURE__*/React.createElement("h1", {
    className: "sm-headline-lg"
  }, "Datab\xE1ze \u0161kol"), /*#__PURE__*/React.createElement("p", {
    className: "sm-body-md",
    style: {
      marginTop: 'var(--space-sm)',
      color: 'var(--secondary)'
    }
  }, "1 284 st\u0159edn\xEDch \u0161kol v \u010Cesku. \u010C\xEDsla jsou z p\u0159ij\xEDmac\xEDho \u0159\xEDzen\xED 2025."), /*#__PURE__*/React.createElement(Divider, {
    spacing: "var(--space-lg)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '260px 1fr',
      gap: 'var(--space-xxl)'
    }
  }, /*#__PURE__*/React.createElement("aside", null, /*#__PURE__*/React.createElement("p", {
    className: "sm-label-caps",
    style: {
      color: 'var(--on-surface-faint)',
      marginBottom: 'var(--space-md)'
    }
  }, "Filtry"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '11px'
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    label: "Jen st\xE1tn\xED \u0161koly",
    checked: pub,
    onChange: setPub
  }), /*#__PURE__*/React.createElement(Checkbox, {
    label: "Nab\xEDz\xED IT zam\u011B\u0159en\xED",
    checked: false,
    onChange: () => {}
  }), /*#__PURE__*/React.createElement(Checkbox, {
    label: "Bez p\u0159ij\xEDmac\xED zkou\u0161ky",
    checked: false,
    onChange: () => {}
  }), /*#__PURE__*/React.createElement(Checkbox, {
    label: "Osmilet\xE9 studium",
    checked: false,
    onChange: () => {}
  })), /*#__PURE__*/React.createElement(Divider, {
    spacing: "var(--space-lg)"
  }), /*#__PURE__*/React.createElement("p", {
    className: "sm-label-caps",
    style: {
      color: 'var(--on-surface-faint)',
      marginBottom: 'var(--space-sm)'
    }
  }, "Aktivn\xED"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px'
    }
  }, filters.map(t => /*#__PURE__*/React.createElement(Chip, {
    key: t,
    onRemove: () => setFilters(filters.filter(x => x !== t))
  }, t)))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-md)',
      alignItems: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Input, {
    icon: searchIcon,
    placeholder: "N\xE1zev \u0161koly, obor nebo obec",
    value: q,
    onChange: e => setQ(e.target.value)
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary"
  }, "Srovnat vybran\xE9")), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: 'var(--space-lg)'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, ['Škola', 'Zaměření', 'Míst', 'Hranice 2025', ''].map((h, i) => /*#__PURE__*/React.createElement("th", {
    key: h + i,
    className: "sm-label-caps",
    style: {
      textAlign: i >= 2 && i < 4 ? 'right' : 'left',
      color: 'var(--on-surface-faint)',
      padding: '0 0 8px',
      borderBottom: '1px solid var(--border-strong)',
      fontWeight: 600
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, rows.map(([name, meta, focus, seats, cut]) => /*#__PURE__*/React.createElement("tr", {
    key: name,
    style: {
      cursor: 'pointer'
    },
    onClick: () => go('detail')
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: 'var(--row-pad-dense) 0',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sm-body-sm",
    style: {
      fontWeight: 600
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    className: "sm-caption"
  }, meta)), /*#__PURE__*/React.createElement("td", {
    className: "sm-body-sm",
    style: {
      padding: 'var(--row-pad-dense) 0',
      borderBottom: '1px solid var(--border)',
      color: 'var(--secondary)'
    }
  }, focus), /*#__PURE__*/React.createElement("td", {
    className: "sm-data-sm",
    style: {
      padding: 'var(--row-pad-dense) 0',
      borderBottom: '1px solid var(--border)',
      textAlign: 'right'
    }
  }, seats), /*#__PURE__*/React.createElement("td", {
    className: "sm-data-sm",
    style: {
      padding: 'var(--row-pad-dense) 0',
      borderBottom: '1px solid var(--border)',
      textAlign: 'right'
    }
  }, cut), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: 'var(--row-pad-dense) 0 var(--row-pad-dense) var(--space-md)',
      borderBottom: '1px solid var(--border)',
      width: 20
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--on-surface-faint)",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m9 5 7 7-7 7"
  })))))))))), /*#__PURE__*/React.createElement(Footer, null));
}
Object.assign(window, {
  Search
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/skolamatch/Search.jsx", error: String((e && e.message) || e) }); }

// ui_kits/skolamatch/Shell.jsx
try { (() => {
const {
  Button,
  Divider
} = window.KolaMatchDesignSystem_90cf52;
function Wordmark({
  tone = 'primary'
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-serif-display)',
      fontWeight: 600,
      fontSize: 21,
      letterSpacing: '-0.01em',
      fontVariationSettings: "'SOFT' 40, 'opsz' 24",
      color: tone === 'primary' ? 'var(--primary)' : 'var(--surface)'
    }
  }, "\u0160kolaMatch");
}
function Header({
  go,
  active
}) {
  const items = [['search', 'Databáze škol'], ['quiz', 'Dotazník'], ['results', 'Moje shody']];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 30,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--content-max)',
      margin: '0 auto',
      padding: '0 var(--page-margin)',
      height: 68,
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-xxl)'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      go('landing');
    },
    style: {
      borderBottom: 0,
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(Wordmark, null)), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 'var(--space-lg)',
      flex: 1
    }
  }, items.map(([k, label]) => /*#__PURE__*/React.createElement("a", {
    key: k,
    href: "#",
    onClick: e => {
      e.preventDefault();
      go(k);
    },
    style: {
      fontSize: 'var(--fs-body-sm)',
      fontWeight: active === k ? 600 : 400,
      color: active === k ? 'var(--on-surface)' : 'var(--secondary)',
      borderBottom: 0
    }
  }, label))), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: () => go('paywall')
  }, "P\u0159ihl\xE1sit se"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    onClick: () => go('quiz')
  }, "Za\u010D\xEDt dotazn\xEDk")));
}
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      maxWidth: 'var(--content-max)',
      margin: '0 auto',
      padding: '0 var(--page-margin) var(--space-xxl)'
    }
  }, /*#__PURE__*/React.createElement(Divider, {
    strong: true,
    spacing: "var(--space-xl)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: 'var(--space-xl)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Wordmark, null), /*#__PURE__*/React.createElement("p", {
    className: "sm-caption",
    style: {
      marginTop: 'var(--space-sm)',
      maxWidth: '46ch'
    }
  }, "Data o oborech a hranic\xEDch p\u0159ijet\xED p\u0159eb\xEDr\xE1me z ve\u0159ejn\xFDch rejst\u0159\xEDk\u016F M\u0160MT a z v\xFDsledk\u016F jednotn\xE9 p\u0159ij\xEDmac\xED zkou\u0161ky. U ka\u017Ed\xE9ho \u010D\xEDsla uv\xE1d\xEDme rok a zdroj.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-lg)'
    }
  }, ['Jak to funguje', 'Zdroje dat', 'Ceník', 'Kontakt'].map(t => /*#__PURE__*/React.createElement("a", {
    key: t,
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      fontSize: 'var(--fs-body-sm)',
      color: 'var(--secondary)',
      borderBottom: 0
    }
  }, t)))));
}

/* Photography placeholder — no imagery assets were supplied with DESIGN.md. */
function PhotoSlot({
  height = 320,
  label = 'Fotografie · reální lidé, teplý tón'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height,
      borderRadius: 'var(--radius-card)',
      background: 'var(--neutral)',
      border: '1px dashed var(--border-strong)',
      display: 'flex',
      alignItems: 'flex-end',
      padding: 'var(--space-md)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "sm-caption",
    style: {
      color: 'var(--on-surface-faint)'
    }
  }, label));
}
function Page({
  children,
  wide
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: wide ? '100%' : 'var(--content-max)',
      margin: '0 auto',
      padding: 'var(--space-xxl) var(--page-margin)'
    }
  }, children);
}
Object.assign(window, {
  Wordmark,
  Header,
  Footer,
  PhotoSlot,
  Page
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/skolamatch/Shell.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.Divider = __ds_scope.Divider;

__ds_ns.MatchIndicator = __ds_scope.MatchIndicator;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.OptionRow = __ds_scope.OptionRow;

})();
