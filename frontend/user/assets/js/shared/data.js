const COFFEE_CATEGORY_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(4 4)">
      <path d="M15.0868 3H0.9132L2.07987 17H13.92013L15.0868 3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <g fill="currentColor" transform="translate(4 8)">
        <ellipse cx="5.5" cy="2" rx="1.5" ry="1" transform="rotate(-45 5.5 2)"/>
        <ellipse cx="2.5" cy="2" rx="1.5" ry="1" transform="rotate(-45 2.5 2)"/>
      </g>
      <path d="M15.38743-1H0.61257L2.27924 4H13.72076L15.38743-1Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" transform="matrix(1 0 0 -1 0 3)"/>
      <line x1="0" y1="3" x2="16" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="2" y1="13" x2="13.7087" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="2" y1="7" x2="13.7087" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>
`.trim();

const SNACK_CATEGORY_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(6 4)">
      <path d="M11.6571 3H0.3429L-1 6.1059V17H13V6.1059L11.6571 3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <g fill="currentColor" transform="translate(2 9)">
        <ellipse cx="5.5" cy="2" rx="1.5" ry="1" transform="rotate(-45 5.5 2)"/>
        <ellipse cx="2.5" cy="2" rx="1.5" ry="1" transform="rotate(-45 2.5 2)"/>
      </g>
      <rect x="0" y="-1" width="4" height="4" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <rect x="8" y="-1" width="4" height="4" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    </g>
    <rect x="10" y="3" width="4" height="7" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
  </svg>
`.trim();

const ALL_CATEGORY_ICON = `
  <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M25 10.4V3H21V10.4C19.2 11.2 18 13 18 15V29H28V15C28 13 26.8 11.2 25 10.4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="18" y="17" width="7" height="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="21" y1="6" x2="25" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M5.5 13H11.4L12.6 16.1C13.3 17.9 12.8 20 11.4 21.3C9.7 22.9 7.1 22.9 5.4 21.3C4 20 3.5 17.9 4.2 16.1L5.5 13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8.5 25.7C8.5 27.3 7.4 28.6 5.9 29H11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8.5 22.5V24.5V25.7C8.5 27.3 9.6 28.6 11.1 29" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`.trim();

const NON_COFFEE_CATEGORY_ICON = `
  <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(0 512) scale(0.1 -0.1)" fill="currentColor" stroke="none">
      <path d="M2375 5114 c-370 -38 -643 -112 -932 -253 -255 -125 -450 -261 -651 -455 -230 -223 -385 -433 -521 -707 -187 -375 -266 -718 -265 -1144 0 -300 34 -518 120 -780 128 -387 327 -711 622 -1008 219 -221 423 -368 697 -503 255 -125 485 -196 775 -240 159 -25 518 -25 685 -1 284 42 525 116 780 242 513 252 911 647 1164 1156 127 255 207 511 247 794 27 188 25 530 -4 712 -152 946 -795 1721 -1700 2049 -117 42 -346 99 -482 119 -101 15 -452 27 -535 19z m488 -480 c302 -42 611 -160 868 -332 161 -108 160 -87 14 -232 l-125 -125 0 104 c0 118 -15 162 -64 192 -30 18 -69 19 -995 19 -949 0 -964 0 -996 -20 -53 -33 -65 -71 -65 -209 l0 -121 -55 0 c-65 0 -120 -24 -158 -69 -39 -47 -50 -92 -45 -201 3 -85 7 -102 31 -138 14 -23 47 -53 72 -67 25 -15 45 -31 45 -35 0 -8 10 -80 135 -999 l67 -484 -334 -334 -333 -334 -28 33 c-51 60 -138 196 -192 300 -160 308 -236 621 -236 978 0 231 27 421 90 625 214 693 778 1228 1481 1405 113 28 281 56 390 64 92 6 318 -4 433 -20z m1428 -892 c160 -239 269 -514 325 -817 22 -121 30 -469 15 -606 -47 -402 -205 -788 -448 -1089 -78 -96 -256 -268 -355 -343 -283 -212 -611 -348 -973 -403 -151 -22 -432 -23 -589 0 -348 50 -701 195 -958 392 l-60 47 208 209 c168 167 210 205 216 191 4 -10 14 -74 23 -142 22 -170 55 -230 157 -286 l53 -30 636 -3 c617 -2 638 -2 690 18 70 26 118 66 151 127 25 45 38 131 188 1223 l161 1175 232 232 c183 184 234 230 245 221 7 -6 45 -59 83 -116z m-1436 -562 l-230 -230 -527 0 -527 0 -6 33 c-10 58 -55 392 -55 410 0 16 44 17 787 17 l788 0 -230 -230z m720 -63 c-9 -67 -18 -132 -21 -144 -4 -23 -7 -23 -142 -23 l-137 0 155 155 c85 85 157 150 158 145 2 -6 -3 -66 -13 -133z m-1075 -290 c0 -1 -181 -182 -402 -402 l-403 -400 395 397 395 398 -450 3 -450 2 458 3 c251 1 457 1 457 -1z m845 -4 l-190 -3 -107 -107 c-105 -104 -107 -108 -90 -128 17 -20 17 -20 -6 -1 l-23 20 113 113 113 113 190 -2 190 -3 -190 -2z m182 -45 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m-1920 -60 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m1910 -20 c-3 -7 -5 -2 -5 12 0 14 2 19 5 13 2 -7 2 -19 0 -25z m-10 -70 c-3 -7 -5 -2 -5 12 0 14 2 19 5 13 2 -7 2 -19 0 -25z m-1860 -60 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m1850 -10 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m-460 -75 c-3 -10 -5 -4 -5 12 0 17 2 24 5 18 2 -7 2 -21 0 -30z m450 -5 c-3 -7 -5 -2 -5 12 0 14 2 19 5 13 2 -7 2 -19 0 -25z m-10 -70 c-3 -7 -5 -2 -5 12 0 14 2 19 5 13 2 -7 2 -19 0 -25z m-440 -15 c-3 -10 -5 -4 -5 12 0 17 2 24 5 18 2 -7 2 -21 0 -30z m-1360 -45 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m1350 -10 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m440 0 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m-10 -70 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m-10 -80 c-3 -7 -5 -2 -5 12 0 14 2 19 5 13 2 -7 2 -19 0 -25z m-497 -28 c-6 -11 -13 -20 -16 -20 -2 0 0 9 6 20 6 11 13 20 16 20 2 0 0 -9 -6 -20z m487 -42 c-3 -7 -5 -2 -5 12 0 14 2 19 5 13 2 -7 2 -19 0 -25z m-507 8 c0 -2 -8 -10 -17 -17 -16 -13 -17 -12 -4 4 13 16 21 21 21 13z m-30 -39 c0 -2 -10 -12 -22 -23 l-23 -19 19 23 c18 21 26 27 26 19z m527 -39 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m-577 -21 c0 -2 -12 -14 -27 -28 l-28 -24 24 28 c23 25 31 32 31 24z m567 -59 c-3 -7 -5 -2 -5 12 0 14 2 19 5 13 2 -7 2 -19 0 -25z m-647 -13 c-7 -9 -27 -25 -44 -37 -23 -15 -21 -11 9 16 43 38 55 45 35 21z m637 -57 c-3 -7 -5 -2 -5 12 0 14 2 19 5 13 2 -7 2 -19 0 -25z m-1372 -138 l-130 -130 733 2 c402 2 732 0 732 -4 0 -5 -334 -8 -742 -8 l-743 0 135 135 c74 74 137 135 140 135 2 0 -54 -59 -125 -130z m176 83 c13 -16 12 -17 -3 -4 -10 7 -18 15 -18 17 0 8 8 3 21 -13z m1186 -15 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m-900 -24 c-3 -3 -12 -4 -19 -1 -8 3 -5 6 6 6 11 1 17 -2 13 -5z m-154 -11 c-7 -2 -19 -2 -25 0 -7 3 -2 5 12 5 14 0 19 -2 13 -5z m100 0 c-7 -2 -19 -2 -25 0 -7 3 -2 5 12 5 14 0 19 -2 13 -5z m944 -35 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m-10 -80 c-3 -7 -5 -2 -5 12 0 14 2 19 5 13 2 -7 2 -19 0 -25z m-27 -190 c0 -37 -43 -317 -52 -341 -15 -37 -70 -84 -115 -96 -52 -15 -1174 -15 -1226 0 -45 12 -100 59 -115 96 -9 24 -52 304 -52 341 0 9 173 12 780 12 607 0 780 -3 780 -12z"/>
    </g>
  </svg>
`.trim();

const CATEGORIES = [
  { key: "Semua", icon: ALL_CATEGORY_ICON },
  { key: "Kopi", icon: COFFEE_CATEGORY_ICON },
  { key: "Coffee", icon: COFFEE_CATEGORY_ICON },
  { key: "Snack", icon: SNACK_CATEGORY_ICON },
  { key: "Non Coffee", icon: NON_COFFEE_CATEGORY_ICON },
  { key: "Non-Coffee", icon: NON_COFFEE_CATEGORY_ICON },
  { key: "Teh", icon: "\ud83c\udf75" },
  { key: "Jus", icon: "\ud83e\uddc3" },
];

const SORT_OPTIONS = [
  { key: "popular", label: "Populer" },
  { key: "rating", label: "Rating" },
  { key: "price", label: "Harga" },
];

const STORAGE_KEYS = {
  activeOrder: "unclejo-active-order",
  activePromo: "unclejo-active-promo",
  cart: "unclejo-cart",
  feedback: "unclejo-feedback",
};
