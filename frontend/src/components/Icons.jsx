const Icon = ({ d, size = 18, fill = "none", strokeWidth = 1.7, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);

export const I = {
  home:     (p) => <Icon size={p?.size} d={<><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10v9h5v-5h4v5h5v-9"/></>}/>,
  users:    (p) => <Icon size={p?.size} d={<><circle cx="9" cy="9" r="3.2"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="10" r="2.5"/><path d="M15 14.5c2.5.3 5 1.7 5 4.5"/></>}/>,
  calendar: (p) => <Icon size={p?.size} d={<><rect x="3.5" y="4.5" width="17" height="16" rx="2"/><path d="M3.5 9.5h17"/><path d="M8 3v3M16 3v3"/></>}/>,
  chart:    (p) => <Icon size={p?.size} d={<><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15v-4M12 15V8M16 15v-6"/></>}/>,
  wallet:   (p) => <Icon size={p?.size} d={<><path d="M3 7a2 2 0 0 1 2-2h13l3 4v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 9h18"/><circle cx="17" cy="14" r="1.2"/></>}/>,
  heart:    (p) => <Icon size={p?.size} d="M12 19s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 9c0 5.7-7 10-7 10z"/>,
  baby:     (p) => <Icon size={p?.size} d={<><circle cx="12" cy="9" r="4"/><path d="M9 9h.01M15 9h.01"/><path d="M10 12c.5.7 1.2 1 2 1s1.5-.3 2-1"/><path d="M5 21c1-4 3.5-6 7-6s6 2 7 6"/></>}/>,
  hand:     (p) => <Icon size={p?.size} d={<><path d="M7 11V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M10 11V4.5a1.5 1.5 0 0 1 3 0V11"/><path d="M13 11V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M16 11V7.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 7-6.5 7S6 19 6 15v-2c0-1.5 1-2 2-2"/></>}/>,
  child:    (p) => <Icon size={p?.size} d={<><circle cx="12" cy="6" r="2.5"/><path d="M9 11l3-2 3 2"/><path d="M12 9v6"/><path d="M9 19l3-4 3 4"/></>}/>,
  bell:     (p) => <Icon size={p?.size} d={<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5z"/><path d="M10 20a2 2 0 0 0 4 0"/></>}/>,
  search:   (p) => <Icon size={p?.size} d={<><circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/></>}/>,
  plus:     (p) => <Icon size={p?.size} strokeWidth={2.2} d="M12 5v14M5 12h14"/>,
  minus:    (p) => <Icon size={p?.size} strokeWidth={2.2} d="M5 12h14"/>,
  x:        (p) => <Icon size={p?.size} d="M6 6l12 12M18 6L6 18"/>,
  check:    (p) => <Icon size={p?.size} strokeWidth={2.2} d="M5 12.5l4 4 10-10"/>,
  arrowUp:  (p) => <Icon size={p?.size} strokeWidth={2.2} d="M12 19V5M5 12l7-7 7 7"/>,
  arrowDown:(p) => <Icon size={p?.size} strokeWidth={2.2} d="M12 5v14M19 12l-7 7-7-7"/>,
  chevR:    (p) => <Icon size={p?.size} d="M9 6l6 6-6 6"/>,
  more:     (p) => <Icon size={p?.size} d={<><circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/></>}/>,
  edit:     (p) => <Icon size={p?.size} d={<><path d="M14 4l6 6-11 11H3v-6z"/><path d="M13 5l6 6"/></>}/>,
  trash:    (p) => <Icon size={p?.size} d={<><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></>}/>,
  filter:   (p) => <Icon size={p?.size} d="M4 5h16l-6 8v6l-4-2v-4z"/>,
  download: (p) => <Icon size={p?.size} d={<><path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/></>}/>,
  settings: (p) => <Icon size={p?.size} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></>}/>,
  menu:     (p) => <Icon size={p?.size} d={<><path d="M4 7h16M4 12h16M4 17h16"/></>}/>,
  clock:    (p) => <Icon size={p?.size} d={<><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></>}/>,
  pin:      (p) => <Icon size={p?.size} d={<><path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></>}/>,
  back:     (p) => <Icon size={p?.size} d="M15 6l-6 6 6 6"/>,
  dashboard:(p) => <Icon size={p?.size} d={<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>}/>,
  coin:        (p) => <Icon size={p?.size} d={<><circle cx="12" cy="12" r="8"/><path d="M12 8v.5M12 15.5v.5M10 10.5h2.5a1.5 1.5 0 0 1 0 3h-1a1.5 1.5 0 0 0 0 3H14"/></>}/>,
  cash:        (p) => <Icon size={p?.size} d={<><rect x="2" y="8" width="20" height="10" rx="2"/><circle cx="12" cy="13" r="2"/><path d="M6 8V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/><path d="M6 13h.01M18 13h.01"/></>}/>,
  arrowBarDown:(p) => <Icon size={p?.size} d={<><path d="M4 20h16"/><path d="M12 4v12"/><path d="M7 13l5 5 5-5"/></>}/>,
  arrowBarUp:  (p) => <Icon size={p?.size} d={<><path d="M4 4h16"/><path d="M12 20V8"/><path d="M7 11l5-5 5 5"/></>}/>,
  scale:       (p) => <Icon size={p?.size} d={<><path d="M12 3v18M8 21h8"/><path d="M3 7h18"/><path d="M3 7v2a3.5 3.5 0 0 0 7 0V7"/><path d="M14 7v2a3.5 3.5 0 0 0 7 0V7"/></>}/>,
  percent:     (p) => <Icon size={p?.size} d={<><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/><path d="M6 18L18 6"/></>}/>,
};
