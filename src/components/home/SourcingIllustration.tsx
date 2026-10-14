import { useId, type SVGProps } from "react";

type Variant = "confectionery" | "snacks" | "food" | "other";
type Props = SVGProps<SVGSVGElement> & { variant: Variant };

/**
 * Four original, self-contained product still-life illustrations.
 * No external image requests, 3D framework, stock-photo dependency or fictitious branded products.
 * The glass, foils and packaging are illustrative trade categories, not real SKUs.
 */
export default function SourcingIllustration({ variant, ...props }: Props) {
  const instanceId = useId();
  const id = "lrx-art-" + instanceId.replace(/:/g, "") + "-" + variant;
  const grad = (name: string) => "url(#" + id + "-" + name + ")";

  return (
    <svg viewBox="0 0 540 380" fill="none" aria-hidden="true" focusable="false" {...props}>
      <defs>
        <linearGradient id={id + "-navy"} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#5D779D" /><stop offset=".38" stopColor="#273754" /><stop offset="1" stopColor="#09111E" />
        </linearGradient>
        <linearGradient id={id + "-paper"} x1=".15" y1="0" x2=".88" y2="1">
          <stop stopColor="#F6E6C3" /><stop offset=".6" stopColor="#BD946B" /><stop offset="1" stopColor="#654631" />
        </linearGradient>
        <linearGradient id={id + "-foil"} x1=".05" y1="0" x2="1" y2=".8">
          <stop stopColor="#EAD7B5" /><stop offset=".18" stopColor="#BBA57D" /><stop offset=".6" stopColor="#5E6C8D" /><stop offset="1" stopColor="#162841" />
        </linearGradient>
        <linearGradient id={id + "-red"} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#FF8D93" /><stop offset=".42" stopColor="#D34755" /><stop offset="1" stopColor="#722331" />
        </linearGradient>
        <linearGradient id={id + "-blue"} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#B1D7FC" /><stop offset=".42" stopColor="#477DCE" /><stop offset="1" stopColor="#192B5B" />
        </linearGradient>
        <linearGradient id={id + "-gold"} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#FFF1A1" /><stop offset=".42" stopColor="#C99145" /><stop offset="1" stopColor="#654026" />
        </linearGradient>
        <linearGradient id={id + "-glass"} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#3E3231" stopOpacity=".5" /><stop offset=".15" stopColor="#F5CE69" stopOpacity=".65" />
          <stop offset=".57" stopColor="#C99647" stopOpacity=".92" /><stop offset=".88" stopColor="#FFF2A2" stopOpacity=".55" />
          <stop offset="1" stopColor="#463121" stopOpacity=".8" />
        </linearGradient>
        <radialGradient id={id + "-halo"}>
          <stop stopColor={variant === "confectionery" ? "#D55766" : variant === "snacks" ? "#668FEF" : variant === "food" ? "#60AAC8" : "#9B679C"} stopOpacity=".45" />
          <stop offset="1" stopColor="#07121F" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="282" cy="160" rx="200" ry="165" fill={grad("halo")} />
      <ellipse cx="288" cy="326" rx="196" ry="32" fill="#000000" opacity=".12" />
      <ellipse cx="288" cy="326" rx="178" ry="20" fill="#000000" opacity=".22" />
      <path d="M48 336Q271 322 492 336" stroke="#F2E5D3" strokeOpacity=".18" strokeWidth="2" />
      <path d="M61 351H484" stroke="#99A3B5" strokeOpacity=".07" />

      {variant === "confectionery" && (
        <g>
          {/* Burlap-like cocoa sack, tied with string */}
          <path d="M83 294Q99 241 105 186L113 128Q141 109 180 128L192 180Q211 262 221 302Q156 336 83 294Z" fill={grad("paper")} stroke="#EDCAA1" strokeWidth="2" />
          <path d="M113 137Q147 150 179 137L182 149Q148 166 107 148Z" fill="#6B5039"/>
          <path d="M112 132Q141 103 180 133" stroke="#EDD0A2" strokeWidth="10" strokeLinecap="round"/>
          <path d="M114 156Q146 176 183 154M97 241Q146 259 204 240" stroke="#FAE3BB" strokeOpacity=".35" strokeWidth="3"/>
          <path d="M100 293Q158 315 217 300" stroke="#573920" strokeOpacity=".6" strokeWidth="2" strokeDasharray="5 6"/>
          <path d="M151 181C170 177 175 210 152 238C128 241 121 207 151 181Z" fill="#583823" stroke="#36221B" strokeWidth="2"/>
          <path d="M151 185Q141 210 153 231" stroke="#EAC694" strokeWidth="3" strokeLinecap="round"/>

          {/* Sleek generic confectionery presentation box */}
          <g transform="rotate(-11 323 191)">
            <rect x="229" y="121" width="179" height="157" rx="17" fill={grad("red")} stroke="#FFB6B3" strokeOpacity=".7" strokeWidth="2"/>
            <rect x="242" y="134" width="153" height="131" rx="11" stroke="#FFF2E4" strokeOpacity=".36"/>
            <path d="M229 174H408" stroke="#FFB7B1" strokeOpacity=".4" strokeWidth="2"/>
            <path d="M275 225C304 163 347 164 376 223Q346 265 275 225Z" fill="#3C1C21" stroke="#FFD1BC" strokeOpacity=".65" strokeWidth="3"/>
            <path d="M292 213Q325 197 364 213M292 231Q325 247 362 230" stroke="#F6B991" strokeWidth="3"/>
            <text x="318" y="158" fill="#FCE8DD" fontSize="11" fontWeight="700" letterSpacing="3" textAnchor="middle">CONFECTIONERY</text>
          </g>
          <g transform="rotate(17 380 300)">
            <rect x="328" y="273" width="120" height="37" rx="8" fill="#442622" stroke="#A56C4D" strokeWidth="2"/>
            <path d="M342 274V306M363 274V306M384 274V306M405 274V306M427 274V306" stroke="#754D3F" strokeWidth="2"/>
            <path d="M331 281H445" stroke="#D29C6E" strokeWidth="2" strokeOpacity=".8"/>
          </g>
          <path d="M233 308C267 295 284 316 307 311" stroke="#D7A26A" strokeOpacity=".65" strokeWidth="3" strokeLinecap="round"/>
        </g>
      )}

      {variant === "snacks" && (
        <g>
          {/* Stacked wafer package and visible biscuit cross-sections */}
          <g transform="rotate(-10 222 214)">
            <rect x="114" y="121" width="190" height="168" rx="15" fill={grad("blue")} stroke="#C1DDF9" strokeOpacity=".75" strokeWidth="2"/>
            <path d="M114 174H304" stroke="#DDEAFF" strokeOpacity=".45" strokeWidth="2"/>
            <path d="M131 137H287" stroke="#EDF6FF" strokeOpacity=".4"/>
            <rect x="135" y="186" width="147" height="77" rx="6" fill="#19294A" stroke="#B9D8F9" strokeOpacity=".56"/>
            <g stroke="#DDC18B" strokeWidth="4" strokeLinecap="round">
              <path d="M146 203H272M146 216H272M146 229H272M146 242H272" />
            </g>
            <path d="M149 197H273M149 249H273" stroke="#F8E3B6" strokeWidth="2"/>
            <text x="210" y="156" textAnchor="middle" fill="#F6F9FF" fontSize="14" fontWeight="700" letterSpacing="2">BISCUITS</text>
          </g>
          <g transform="rotate(9 383 224)">
            <rect x="324" y="143" width="132" height="154" rx="13" fill={grad("red")} stroke="#FFB5C0" strokeOpacity=".7" strokeWidth="2"/>
            <path d="M336 156H443" stroke="#FFDFE3" strokeOpacity=".65" />
            <circle cx="390" cy="225" r="47" fill="#573040" stroke="#F6D5A9" strokeWidth="4"/>
            <circle cx="390" cy="225" r="33" fill="#C58B55" stroke="#FFF0C5" strokeWidth="3"/>
            <circle cx="382" cy="216" r="4" fill="#6F432C"/><circle cx="403" cy="220" r="5" fill="#7C4630"/><circle cx="395" cy="243" r="4" fill="#7C4630"/>
            <text x="390" y="172" textAnchor="middle" fill="#FFF1EC" fontSize="12" fontWeight="700">SNACKS</text>
          </g>
          <g transform="rotate(-9 304 304)">
            <rect x="245" y="292" width="117" height="28" rx="6" fill="#D29A6A" stroke="#F7D7A1" strokeWidth="2"/>
            <path d="M257 295H350M257 302H350M257 310H350" stroke="#7F533B" strokeWidth="2"/>
          </g>
        </g>
      )}

      {variant === "food" && (
        <g>
          {/* Condiments/oil bottles, generic unbranded packaging */}
          <g transform="rotate(-9 165 221)">
            <rect x="128" y="90" width="73" height="212" rx="19" fill={grad("glass")} stroke="#F4DB9E" strokeWidth="2"/>
            <rect x="144" y="61" width="42" height="37" rx="4" fill="#F7E1AF" stroke="#D0AE6F" strokeWidth="2"/>
            <rect x="138" y="54" width="54" height="13" rx="4" fill={grad("gold")}/>
            <path d="M142 117V260" stroke="#FFF4BA" strokeOpacity=".5" strokeWidth="8" strokeLinecap="round"/>
            <rect x="139" y="188" width="50" height="66" rx="4" fill="#EEE3C1" fillOpacity=".93"/>
            <path d="M143 207H185M143 219H185" stroke="#477E73" strokeWidth="3"/>
            <text x="164" y="240" textAnchor="middle" fontSize="9" fontWeight="700" fill="#4A6B50">FOOD</text>
          </g>
          <g transform="rotate(10 261 232)">
            <rect x="225" y="119" width="77" height="188" rx="19" fill={grad("glass")} stroke="#F4DBA9" strokeWidth="2"/>
            <rect x="241" y="84" width="45" height="40" rx="5" fill="#E9CB8A" stroke="#F3DEA6" strokeWidth="2"/>
            <rect x="235" y="79" width="57" height="11" rx="4" fill={grad("gold")}/>
            <path d="M239 146V260" stroke="#FFE6AB" strokeOpacity=".48" strokeWidth="9" strokeLinecap="round"/>
            <rect x="236" y="210" width="56" height="62" rx="4" fill="#F5E8C4"/>
            <path d="M246 236H282" stroke="#557A69" strokeWidth="4"/><path d="M253 248H275" stroke="#B69B69" strokeWidth="2"/>
          </g>
          {/* Dry goods pouch */}
          <path d="M312 182L425 179L457 309Q397 337 306 310Z" fill={grad("paper")} stroke="#F6D3A8" strokeWidth="2" />
          <path d="M312 183Q371 193 425 181" stroke="#704C35" strokeWidth="8" strokeLinecap="round" />
          <path d="M338 244Q379 217 419 247Q411 277 371 288Q346 279 338 244Z" fill="#9E6B41" stroke="#F2C98A" strokeWidth="3"/>
          <g fill="#E8BF7C">
            <ellipse cx="358" cy="255" rx="5" ry="3" transform="rotate(35 358 255)"/>
            <ellipse cx="374" cy="241" rx="5" ry="3" transform="rotate(35 374 241)"/>
            <ellipse cx="386" cy="265" rx="5" ry="3" transform="rotate(35 386 265)"/>
            <ellipse cx="406" cy="251" rx="5" ry="3" transform="rotate(35 406 251)"/>
          </g>
        </g>
      )}

      {variant === "other" && (
        <g>
          {/* Sourcing variety: stacked cartons and a neutral personal-care container */}
          <g transform="rotate(-9 238 220)">
            <path d="M138 148L225 115L323 153L235 195Z" fill="#C6B8A3" stroke="#EFE7D6" strokeWidth="2"/>
            <path d="M138 148V274L235 322V195Z" fill={grad("paper")} stroke="#DEC6A7" strokeWidth="2"/>
            <path d="M235 195L323 153V269L235 322Z" fill="#6F5C4D" stroke="#B79979" strokeWidth="2"/>
            <path d="M184 132L273 176L273 301L219 277V151Z" fill="#D3AB7C" fillOpacity=".62"/>
            <path d="M169 233L216 254" stroke="#A7775A" strokeWidth="5"/>
            <path d="M169 247L204 264" stroke="#A7775A" strokeWidth="3"/>
          </g>
          <g transform="rotate(11 380 233)">
            <rect x="336" y="127" width="92" height="174" rx="17" fill={grad("blue")} stroke="#B7D9FC" strokeWidth="2"/>
            <rect x="352" y="101" width="59" height="35" rx="6" fill={grad("foil")} stroke="#E4D0B9" strokeWidth="2"/>
            <path d="M346 163H420M346 260H420" stroke="#DCEAFF" strokeOpacity=".5"/>
            <rect x="345" y="187" width="74" height="46" rx="6" fill="#F2E8DA" fillOpacity=".93"/>
            <path d="M356 204H406M356 213H399" stroke="#4877B8" strokeWidth="4" strokeLinecap="round"/>
          </g>
          <g transform="rotate(-6 97 299)">
            <rect x="70" y="265" width="92" height="48" rx="7" fill={grad("red")} stroke="#FFACAE" strokeOpacity=".75" />
            <path d="M82 279H150M82 291H128" stroke="#F9CDD1" strokeOpacity=".65" strokeWidth="2"/>
          </g>
        </g>
      )}

      <path d="M83 355Q269 363 458 355" stroke="#9AC6FF" strokeOpacity=".24" strokeWidth="2"/>
    </svg>
  );
}
