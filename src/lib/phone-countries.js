/**
 * Country dial codes — MIRROR of the Console table
 * (linear-console/src/lib/phone-countries.ts).
 *
 * The shopper picks their country code here; the Console derives the
 * customer's country from the dial prefix of the number that comes back. If
 * this list drifts from the Console's, a storefront can offer a dial code
 * the Console cannot resolve, and the customer's country reads as unknown.
 *
 * That drift is caught by linear-console's
 * tests/static/phone-countries-parity.test.ts, which compares this file
 * row-for-row against the Console table.
 *
 * GENERATED FILE — do not hand-edit. Regenerate with:
 *   node scripts/gen-phone-countries.cjs --mirror <this file>
 * from the linear-console repo.
 */

/** @typedef {{ dial: string, code: string, name: string, shortName: string, flag: string, codes: string[] }} PhoneCountry */

/** The full plan: one row per calling code, sorted by display name. */
export const PHONE_COUNTRIES = [
  { dial: "93", code: "AF", name: "Afghanistan", shortName: "Afghanistan", flag: "🇦🇫", codes: ["AF"] },
  { dial: "355", code: "AL", name: "Albania", shortName: "Albania", flag: "🇦🇱", codes: ["AL"] },
  { dial: "213", code: "DZ", name: "Algeria", shortName: "Algeria", flag: "🇩🇿", codes: ["DZ"] },
  { dial: "376", code: "AD", name: "Andorra", shortName: "Andorra", flag: "🇦🇩", codes: ["AD"] },
  { dial: "244", code: "AO", name: "Angola", shortName: "Angola", flag: "🇦🇴", codes: ["AO"] },
  { dial: "54", code: "AR", name: "Argentina", shortName: "Argentina", flag: "🇦🇷", codes: ["AR"] },
  { dial: "374", code: "AM", name: "Armenia", shortName: "Armenia", flag: "🇦🇲", codes: ["AM"] },
  { dial: "297", code: "AW", name: "Aruba", shortName: "Aruba", flag: "🇦🇼", codes: ["AW"] },
  { dial: "247", code: "AC", name: "Ascension Island", shortName: "Ascension Island", flag: "🇦🇨", codes: ["AC"] },
  { dial: "61", code: "AU", name: "Australia", shortName: "Australia", flag: "🇦🇺", codes: ["AU", "CC", "CX"] },
  { dial: "43", code: "AT", name: "Austria", shortName: "Austria", flag: "🇦🇹", codes: ["AT"] },
  { dial: "994", code: "AZ", name: "Azerbaijan", shortName: "Azerbaijan", flag: "🇦🇿", codes: ["AZ"] },
  { dial: "973", code: "BH", name: "Bahrain", shortName: "Bahrain", flag: "🇧🇭", codes: ["BH"] },
  { dial: "880", code: "BD", name: "Bangladesh", shortName: "Bangladesh", flag: "🇧🇩", codes: ["BD"] },
  { dial: "375", code: "BY", name: "Belarus", shortName: "Belarus", flag: "🇧🇾", codes: ["BY"] },
  { dial: "32", code: "BE", name: "Belgium", shortName: "Belgium", flag: "🇧🇪", codes: ["BE"] },
  { dial: "501", code: "BZ", name: "Belize", shortName: "Belize", flag: "🇧🇿", codes: ["BZ"] },
  { dial: "229", code: "BJ", name: "Benin", shortName: "Benin", flag: "🇧🇯", codes: ["BJ"] },
  { dial: "975", code: "BT", name: "Bhutan", shortName: "Bhutan", flag: "🇧🇹", codes: ["BT"] },
  { dial: "591", code: "BO", name: "Bolivia", shortName: "Bolivia", flag: "🇧🇴", codes: ["BO"] },
  { dial: "387", code: "BA", name: "Bosnia & Herzegovina", shortName: "Bosnia & Herzegovina", flag: "🇧🇦", codes: ["BA"] },
  { dial: "267", code: "BW", name: "Botswana", shortName: "Botswana", flag: "🇧🇼", codes: ["BW"] },
  { dial: "55", code: "BR", name: "Brazil", shortName: "Brazil", flag: "🇧🇷", codes: ["BR"] },
  { dial: "246", code: "IO", name: "British Indian Ocean Territory", shortName: "British Indian Ocean Territory", flag: "🇮🇴", codes: ["IO"] },
  { dial: "673", code: "BN", name: "Brunei", shortName: "Brunei", flag: "🇧🇳", codes: ["BN"] },
  { dial: "359", code: "BG", name: "Bulgaria", shortName: "Bulgaria", flag: "🇧🇬", codes: ["BG"] },
  { dial: "226", code: "BF", name: "Burkina Faso", shortName: "Burkina Faso", flag: "🇧🇫", codes: ["BF"] },
  { dial: "257", code: "BI", name: "Burundi", shortName: "Burundi", flag: "🇧🇮", codes: ["BI"] },
  { dial: "855", code: "KH", name: "Cambodia", shortName: "Cambodia", flag: "🇰🇭", codes: ["KH"] },
  { dial: "237", code: "CM", name: "Cameroon", shortName: "Cameroon", flag: "🇨🇲", codes: ["CM"] },
  { dial: "238", code: "CV", name: "Cape Verde", shortName: "Cape Verde", flag: "🇨🇻", codes: ["CV"] },
  { dial: "236", code: "CF", name: "Central African Republic", shortName: "Central African Republic", flag: "🇨🇫", codes: ["CF"] },
  { dial: "235", code: "TD", name: "Chad", shortName: "Chad", flag: "🇹🇩", codes: ["TD"] },
  { dial: "56", code: "CL", name: "Chile", shortName: "Chile", flag: "🇨🇱", codes: ["CL"] },
  { dial: "86", code: "CN", name: "China", shortName: "China", flag: "🇨🇳", codes: ["CN"] },
  { dial: "57", code: "CO", name: "Colombia", shortName: "Colombia", flag: "🇨🇴", codes: ["CO"] },
  { dial: "269", code: "KM", name: "Comoros", shortName: "Comoros", flag: "🇰🇲", codes: ["KM"] },
  { dial: "242", code: "CG", name: "Congo - Brazzaville", shortName: "Congo - Brazzaville", flag: "🇨🇬", codes: ["CG"] },
  { dial: "243", code: "CD", name: "Congo - Kinshasa", shortName: "Congo - Kinshasa", flag: "🇨🇩", codes: ["CD"] },
  { dial: "682", code: "CK", name: "Cook Islands", shortName: "Cook Islands", flag: "🇨🇰", codes: ["CK"] },
  { dial: "506", code: "CR", name: "Costa Rica", shortName: "Costa Rica", flag: "🇨🇷", codes: ["CR"] },
  { dial: "225", code: "CI", name: "Côte d’Ivoire", shortName: "Côte d’Ivoire", flag: "🇨🇮", codes: ["CI"] },
  { dial: "385", code: "HR", name: "Croatia", shortName: "Croatia", flag: "🇭🇷", codes: ["HR"] },
  { dial: "53", code: "CU", name: "Cuba", shortName: "Cuba", flag: "🇨🇺", codes: ["CU"] },
  { dial: "599", code: "CW", name: "Curaçao", shortName: "Curaçao", flag: "🇨🇼", codes: ["CW", "BQ"] },
  { dial: "357", code: "CY", name: "Cyprus", shortName: "Cyprus", flag: "🇨🇾", codes: ["CY"] },
  { dial: "420", code: "CZ", name: "Czechia", shortName: "Czechia", flag: "🇨🇿", codes: ["CZ"] },
  { dial: "45", code: "DK", name: "Denmark", shortName: "Denmark", flag: "🇩🇰", codes: ["DK"] },
  { dial: "253", code: "DJ", name: "Djibouti", shortName: "Djibouti", flag: "🇩🇯", codes: ["DJ"] },
  { dial: "593", code: "EC", name: "Ecuador", shortName: "Ecuador", flag: "🇪🇨", codes: ["EC"] },
  { dial: "20", code: "EG", name: "Egypt", shortName: "Egypt", flag: "🇪🇬", codes: ["EG"] },
  { dial: "503", code: "SV", name: "El Salvador", shortName: "El Salvador", flag: "🇸🇻", codes: ["SV"] },
  { dial: "240", code: "GQ", name: "Equatorial Guinea", shortName: "Equatorial Guinea", flag: "🇬🇶", codes: ["GQ"] },
  { dial: "291", code: "ER", name: "Eritrea", shortName: "Eritrea", flag: "🇪🇷", codes: ["ER"] },
  { dial: "372", code: "EE", name: "Estonia", shortName: "Estonia", flag: "🇪🇪", codes: ["EE"] },
  { dial: "268", code: "SZ", name: "Eswatini", shortName: "Eswatini", flag: "🇸🇿", codes: ["SZ"] },
  { dial: "251", code: "ET", name: "Ethiopia", shortName: "Ethiopia", flag: "🇪🇹", codes: ["ET"] },
  { dial: "500", code: "FK", name: "Falkland Islands", shortName: "Falkland Islands", flag: "🇫🇰", codes: ["FK"] },
  { dial: "298", code: "FO", name: "Faroe Islands", shortName: "Faroe Islands", flag: "🇫🇴", codes: ["FO"] },
  { dial: "679", code: "FJ", name: "Fiji", shortName: "Fiji", flag: "🇫🇯", codes: ["FJ"] },
  { dial: "358", code: "FI", name: "Finland", shortName: "Finland", flag: "🇫🇮", codes: ["FI", "AX"] },
  { dial: "33", code: "FR", name: "France", shortName: "France", flag: "🇫🇷", codes: ["FR"] },
  { dial: "594", code: "GF", name: "French Guiana", shortName: "French Guiana", flag: "🇬🇫", codes: ["GF"] },
  { dial: "689", code: "PF", name: "French Polynesia", shortName: "French Polynesia", flag: "🇵🇫", codes: ["PF"] },
  { dial: "241", code: "GA", name: "Gabon", shortName: "Gabon", flag: "🇬🇦", codes: ["GA"] },
  { dial: "220", code: "GM", name: "Gambia", shortName: "Gambia", flag: "🇬🇲", codes: ["GM"] },
  { dial: "995", code: "GE", name: "Georgia", shortName: "Georgia", flag: "🇬🇪", codes: ["GE"] },
  { dial: "49", code: "DE", name: "Germany", shortName: "Germany", flag: "🇩🇪", codes: ["DE"] },
  { dial: "233", code: "GH", name: "Ghana", shortName: "Ghana", flag: "🇬🇭", codes: ["GH"] },
  { dial: "350", code: "GI", name: "Gibraltar", shortName: "Gibraltar", flag: "🇬🇮", codes: ["GI"] },
  { dial: "30", code: "GR", name: "Greece", shortName: "Greece", flag: "🇬🇷", codes: ["GR"] },
  { dial: "299", code: "GL", name: "Greenland", shortName: "Greenland", flag: "🇬🇱", codes: ["GL"] },
  { dial: "590", code: "GP", name: "Guadeloupe", shortName: "Guadeloupe", flag: "🇬🇵", codes: ["GP", "BL", "MF"] },
  { dial: "502", code: "GT", name: "Guatemala", shortName: "Guatemala", flag: "🇬🇹", codes: ["GT"] },
  { dial: "224", code: "GN", name: "Guinea", shortName: "Guinea", flag: "🇬🇳", codes: ["GN"] },
  { dial: "245", code: "GW", name: "Guinea-Bissau", shortName: "Guinea-Bissau", flag: "🇬🇼", codes: ["GW"] },
  { dial: "592", code: "GY", name: "Guyana", shortName: "Guyana", flag: "🇬🇾", codes: ["GY"] },
  { dial: "509", code: "HT", name: "Haiti", shortName: "Haiti", flag: "🇭🇹", codes: ["HT"] },
  { dial: "504", code: "HN", name: "Honduras", shortName: "Honduras", flag: "🇭🇳", codes: ["HN"] },
  { dial: "852", code: "HK", name: "Hong Kong SAR China", shortName: "Hong Kong SAR China", flag: "🇭🇰", codes: ["HK"] },
  { dial: "36", code: "HU", name: "Hungary", shortName: "Hungary", flag: "🇭🇺", codes: ["HU"] },
  { dial: "354", code: "IS", name: "Iceland", shortName: "Iceland", flag: "🇮🇸", codes: ["IS"] },
  { dial: "91", code: "IN", name: "India", shortName: "India", flag: "🇮🇳", codes: ["IN"] },
  { dial: "62", code: "ID", name: "Indonesia", shortName: "Indonesia", flag: "🇮🇩", codes: ["ID"] },
  { dial: "98", code: "IR", name: "Iran", shortName: "Iran", flag: "🇮🇷", codes: ["IR"] },
  { dial: "964", code: "IQ", name: "Iraq", shortName: "Iraq", flag: "🇮🇶", codes: ["IQ"] },
  { dial: "353", code: "IE", name: "Ireland", shortName: "Ireland", flag: "🇮🇪", codes: ["IE"] },
  { dial: "972", code: "IL", name: "Israel", shortName: "Israel", flag: "🇮🇱", codes: ["IL"] },
  { dial: "39", code: "IT", name: "Italy / Vatican City", shortName: "Italy", flag: "🇮🇹", codes: ["IT", "VA"] },
  { dial: "81", code: "JP", name: "Japan", shortName: "Japan", flag: "🇯🇵", codes: ["JP"] },
  { dial: "962", code: "JO", name: "Jordan", shortName: "Jordan", flag: "🇯🇴", codes: ["JO"] },
  { dial: "254", code: "KE", name: "Kenya", shortName: "Kenya", flag: "🇰🇪", codes: ["KE"] },
  { dial: "686", code: "KI", name: "Kiribati", shortName: "Kiribati", flag: "🇰🇮", codes: ["KI"] },
  { dial: "383", code: "XK", name: "Kosovo", shortName: "Kosovo", flag: "🇽🇰", codes: ["XK"] },
  { dial: "965", code: "KW", name: "Kuwait", shortName: "Kuwait", flag: "🇰🇼", codes: ["KW"] },
  { dial: "996", code: "KG", name: "Kyrgyzstan", shortName: "Kyrgyzstan", flag: "🇰🇬", codes: ["KG"] },
  { dial: "856", code: "LA", name: "Laos", shortName: "Laos", flag: "🇱🇦", codes: ["LA"] },
  { dial: "371", code: "LV", name: "Latvia", shortName: "Latvia", flag: "🇱🇻", codes: ["LV"] },
  { dial: "961", code: "LB", name: "Lebanon", shortName: "Lebanon", flag: "🇱🇧", codes: ["LB"] },
  { dial: "266", code: "LS", name: "Lesotho", shortName: "Lesotho", flag: "🇱🇸", codes: ["LS"] },
  { dial: "231", code: "LR", name: "Liberia", shortName: "Liberia", flag: "🇱🇷", codes: ["LR"] },
  { dial: "218", code: "LY", name: "Libya", shortName: "Libya", flag: "🇱🇾", codes: ["LY"] },
  { dial: "423", code: "LI", name: "Liechtenstein", shortName: "Liechtenstein", flag: "🇱🇮", codes: ["LI"] },
  { dial: "370", code: "LT", name: "Lithuania", shortName: "Lithuania", flag: "🇱🇹", codes: ["LT"] },
  { dial: "352", code: "LU", name: "Luxembourg", shortName: "Luxembourg", flag: "🇱🇺", codes: ["LU"] },
  { dial: "853", code: "MO", name: "Macao SAR China", shortName: "Macao SAR China", flag: "🇲🇴", codes: ["MO"] },
  { dial: "261", code: "MG", name: "Madagascar", shortName: "Madagascar", flag: "🇲🇬", codes: ["MG"] },
  { dial: "265", code: "MW", name: "Malawi", shortName: "Malawi", flag: "🇲🇼", codes: ["MW"] },
  { dial: "60", code: "MY", name: "Malaysia", shortName: "Malaysia", flag: "🇲🇾", codes: ["MY"] },
  { dial: "960", code: "MV", name: "Maldives", shortName: "Maldives", flag: "🇲🇻", codes: ["MV"] },
  { dial: "223", code: "ML", name: "Mali", shortName: "Mali", flag: "🇲🇱", codes: ["ML"] },
  { dial: "356", code: "MT", name: "Malta", shortName: "Malta", flag: "🇲🇹", codes: ["MT"] },
  { dial: "692", code: "MH", name: "Marshall Islands", shortName: "Marshall Islands", flag: "🇲🇭", codes: ["MH"] },
  { dial: "596", code: "MQ", name: "Martinique", shortName: "Martinique", flag: "🇲🇶", codes: ["MQ"] },
  { dial: "222", code: "MR", name: "Mauritania", shortName: "Mauritania", flag: "🇲🇷", codes: ["MR"] },
  { dial: "230", code: "MU", name: "Mauritius", shortName: "Mauritius", flag: "🇲🇺", codes: ["MU"] },
  { dial: "52", code: "MX", name: "Mexico", shortName: "Mexico", flag: "🇲🇽", codes: ["MX"] },
  { dial: "691", code: "FM", name: "Micronesia", shortName: "Micronesia", flag: "🇫🇲", codes: ["FM"] },
  { dial: "373", code: "MD", name: "Moldova", shortName: "Moldova", flag: "🇲🇩", codes: ["MD"] },
  { dial: "377", code: "MC", name: "Monaco", shortName: "Monaco", flag: "🇲🇨", codes: ["MC"] },
  { dial: "976", code: "MN", name: "Mongolia", shortName: "Mongolia", flag: "🇲🇳", codes: ["MN"] },
  { dial: "382", code: "ME", name: "Montenegro", shortName: "Montenegro", flag: "🇲🇪", codes: ["ME"] },
  { dial: "212", code: "MA", name: "Morocco", shortName: "Morocco", flag: "🇲🇦", codes: ["MA", "EH"] },
  { dial: "258", code: "MZ", name: "Mozambique", shortName: "Mozambique", flag: "🇲🇿", codes: ["MZ"] },
  { dial: "95", code: "MM", name: "Myanmar (Burma)", shortName: "Myanmar (Burma)", flag: "🇲🇲", codes: ["MM"] },
  { dial: "264", code: "NA", name: "Namibia", shortName: "Namibia", flag: "🇳🇦", codes: ["NA"] },
  { dial: "674", code: "NR", name: "Nauru", shortName: "Nauru", flag: "🇳🇷", codes: ["NR"] },
  { dial: "977", code: "NP", name: "Nepal", shortName: "Nepal", flag: "🇳🇵", codes: ["NP"] },
  { dial: "31", code: "NL", name: "Netherlands", shortName: "Netherlands", flag: "🇳🇱", codes: ["NL"] },
  { dial: "687", code: "NC", name: "New Caledonia", shortName: "New Caledonia", flag: "🇳🇨", codes: ["NC"] },
  { dial: "64", code: "NZ", name: "New Zealand", shortName: "New Zealand", flag: "🇳🇿", codes: ["NZ"] },
  { dial: "505", code: "NI", name: "Nicaragua", shortName: "Nicaragua", flag: "🇳🇮", codes: ["NI"] },
  { dial: "227", code: "NE", name: "Niger", shortName: "Niger", flag: "🇳🇪", codes: ["NE"] },
  { dial: "234", code: "NG", name: "Nigeria", shortName: "Nigeria", flag: "🇳🇬", codes: ["NG"] },
  { dial: "683", code: "NU", name: "Niue", shortName: "Niue", flag: "🇳🇺", codes: ["NU"] },
  { dial: "672", code: "NF", name: "Norfolk Island", shortName: "Norfolk Island", flag: "🇳🇫", codes: ["NF"] },
  { dial: "850", code: "KP", name: "North Korea", shortName: "North Korea", flag: "🇰🇵", codes: ["KP"] },
  { dial: "389", code: "MK", name: "North Macedonia", shortName: "North Macedonia", flag: "🇲🇰", codes: ["MK"] },
  { dial: "47", code: "NO", name: "Norway", shortName: "Norway", flag: "🇳🇴", codes: ["NO", "SJ"] },
  { dial: "968", code: "OM", name: "Oman", shortName: "Oman", flag: "🇴🇲", codes: ["OM"] },
  { dial: "92", code: "PK", name: "Pakistan", shortName: "Pakistan", flag: "🇵🇰", codes: ["PK"] },
  { dial: "680", code: "PW", name: "Palau", shortName: "Palau", flag: "🇵🇼", codes: ["PW"] },
  { dial: "970", code: "PS", name: "Palestinian Territories", shortName: "Palestinian Territories", flag: "🇵🇸", codes: ["PS"] },
  { dial: "507", code: "PA", name: "Panama", shortName: "Panama", flag: "🇵🇦", codes: ["PA"] },
  { dial: "675", code: "PG", name: "Papua New Guinea", shortName: "Papua New Guinea", flag: "🇵🇬", codes: ["PG"] },
  { dial: "595", code: "PY", name: "Paraguay", shortName: "Paraguay", flag: "🇵🇾", codes: ["PY"] },
  { dial: "51", code: "PE", name: "Peru", shortName: "Peru", flag: "🇵🇪", codes: ["PE"] },
  { dial: "63", code: "PH", name: "Philippines", shortName: "Philippines", flag: "🇵🇭", codes: ["PH"] },
  { dial: "48", code: "PL", name: "Poland", shortName: "Poland", flag: "🇵🇱", codes: ["PL"] },
  { dial: "351", code: "PT", name: "Portugal", shortName: "Portugal", flag: "🇵🇹", codes: ["PT"] },
  { dial: "974", code: "QA", name: "Qatar", shortName: "Qatar", flag: "🇶🇦", codes: ["QA"] },
  { dial: "262", code: "RE", name: "Réunion", shortName: "Réunion", flag: "🇷🇪", codes: ["RE", "YT"] },
  { dial: "40", code: "RO", name: "Romania", shortName: "Romania", flag: "🇷🇴", codes: ["RO"] },
  { dial: "7", code: "RU/KZ", name: "Russia / Kazakhstan", shortName: "Russia", flag: "🇷🇺", codes: ["RU", "KZ"] },
  { dial: "250", code: "RW", name: "Rwanda", shortName: "Rwanda", flag: "🇷🇼", codes: ["RW"] },
  { dial: "290", code: "SH", name: "Saint Helena", shortName: "St. Helena", flag: "🇸🇭", codes: ["SH", "TA"] },
  { dial: "685", code: "WS", name: "Samoa", shortName: "Samoa", flag: "🇼🇸", codes: ["WS"] },
  { dial: "378", code: "SM", name: "San Marino", shortName: "San Marino", flag: "🇸🇲", codes: ["SM"] },
  { dial: "239", code: "ST", name: "São Tomé & Príncipe", shortName: "São Tomé & Príncipe", flag: "🇸🇹", codes: ["ST"] },
  { dial: "966", code: "SA", name: "Saudi Arabia", shortName: "Saudi Arabia", flag: "🇸🇦", codes: ["SA"] },
  { dial: "221", code: "SN", name: "Senegal", shortName: "Senegal", flag: "🇸🇳", codes: ["SN"] },
  { dial: "381", code: "RS", name: "Serbia", shortName: "Serbia", flag: "🇷🇸", codes: ["RS"] },
  { dial: "248", code: "SC", name: "Seychelles", shortName: "Seychelles", flag: "🇸🇨", codes: ["SC"] },
  { dial: "232", code: "SL", name: "Sierra Leone", shortName: "Sierra Leone", flag: "🇸🇱", codes: ["SL"] },
  { dial: "65", code: "SG", name: "Singapore", shortName: "Singapore", flag: "🇸🇬", codes: ["SG"] },
  { dial: "421", code: "SK", name: "Slovakia", shortName: "Slovakia", flag: "🇸🇰", codes: ["SK"] },
  { dial: "386", code: "SI", name: "Slovenia", shortName: "Slovenia", flag: "🇸🇮", codes: ["SI"] },
  { dial: "677", code: "SB", name: "Solomon Islands", shortName: "Solomon Islands", flag: "🇸🇧", codes: ["SB"] },
  { dial: "252", code: "SO", name: "Somalia", shortName: "Somalia", flag: "🇸🇴", codes: ["SO"] },
  { dial: "27", code: "ZA", name: "South Africa", shortName: "South Africa", flag: "🇿🇦", codes: ["ZA"] },
  { dial: "82", code: "KR", name: "South Korea", shortName: "South Korea", flag: "🇰🇷", codes: ["KR"] },
  { dial: "211", code: "SS", name: "South Sudan", shortName: "South Sudan", flag: "🇸🇸", codes: ["SS"] },
  { dial: "34", code: "ES", name: "Spain", shortName: "Spain", flag: "🇪🇸", codes: ["ES"] },
  { dial: "94", code: "LK", name: "Sri Lanka", shortName: "Sri Lanka", flag: "🇱🇰", codes: ["LK"] },
  { dial: "508", code: "PM", name: "St. Pierre & Miquelon", shortName: "St. Pierre & Miquelon", flag: "🇵🇲", codes: ["PM"] },
  { dial: "249", code: "SD", name: "Sudan", shortName: "Sudan", flag: "🇸🇩", codes: ["SD"] },
  { dial: "597", code: "SR", name: "Suriname", shortName: "Suriname", flag: "🇸🇷", codes: ["SR"] },
  { dial: "46", code: "SE", name: "Sweden", shortName: "Sweden", flag: "🇸🇪", codes: ["SE"] },
  { dial: "41", code: "CH", name: "Switzerland", shortName: "Switzerland", flag: "🇨🇭", codes: ["CH"] },
  { dial: "963", code: "SY", name: "Syria", shortName: "Syria", flag: "🇸🇾", codes: ["SY"] },
  { dial: "886", code: "TW", name: "Taiwan", shortName: "Taiwan", flag: "🇹🇼", codes: ["TW"] },
  { dial: "992", code: "TJ", name: "Tajikistan", shortName: "Tajikistan", flag: "🇹🇯", codes: ["TJ"] },
  { dial: "255", code: "TZ", name: "Tanzania", shortName: "Tanzania", flag: "🇹🇿", codes: ["TZ"] },
  { dial: "66", code: "TH", name: "Thailand", shortName: "Thailand", flag: "🇹🇭", codes: ["TH"] },
  { dial: "670", code: "TL", name: "Timor-Leste", shortName: "Timor-Leste", flag: "🇹🇱", codes: ["TL"] },
  { dial: "228", code: "TG", name: "Togo", shortName: "Togo", flag: "🇹🇬", codes: ["TG"] },
  { dial: "690", code: "TK", name: "Tokelau", shortName: "Tokelau", flag: "🇹🇰", codes: ["TK"] },
  { dial: "676", code: "TO", name: "Tonga", shortName: "Tonga", flag: "🇹🇴", codes: ["TO"] },
  { dial: "216", code: "TN", name: "Tunisia", shortName: "Tunisia", flag: "🇹🇳", codes: ["TN"] },
  { dial: "90", code: "TR", name: "Türkiye", shortName: "Türkiye", flag: "🇹🇷", codes: ["TR"] },
  { dial: "993", code: "TM", name: "Turkmenistan", shortName: "Turkmenistan", flag: "🇹🇲", codes: ["TM"] },
  { dial: "688", code: "TV", name: "Tuvalu", shortName: "Tuvalu", flag: "🇹🇻", codes: ["TV"] },
  { dial: "256", code: "UG", name: "Uganda", shortName: "Uganda", flag: "🇺🇬", codes: ["UG"] },
  { dial: "380", code: "UA", name: "Ukraine", shortName: "Ukraine", flag: "🇺🇦", codes: ["UA"] },
  { dial: "971", code: "AE", name: "United Arab Emirates", shortName: "United Arab Emirates", flag: "🇦🇪", codes: ["AE"] },
  { dial: "44", code: "GB", name: "United Kingdom", shortName: "United Kingdom", flag: "🇬🇧", codes: ["GB", "GG", "IM", "JE"] },
  { dial: "1", code: "US/CA", name: "United States / Canada", shortName: "United States", flag: "🇺🇸", codes: ["US", "AG", "AI", "AS", "BB", "BM", "BS", "CA", "DM", "DO", "GD", "GU", "JM", "KN", "KY", "LC", "MP", "MS", "PR", "SX", "TC", "TT", "VC", "VG", "VI"] },
  { dial: "598", code: "UY", name: "Uruguay", shortName: "Uruguay", flag: "🇺🇾", codes: ["UY"] },
  { dial: "998", code: "UZ", name: "Uzbekistan", shortName: "Uzbekistan", flag: "🇺🇿", codes: ["UZ"] },
  { dial: "678", code: "VU", name: "Vanuatu", shortName: "Vanuatu", flag: "🇻🇺", codes: ["VU"] },
  { dial: "58", code: "VE", name: "Venezuela", shortName: "Venezuela", flag: "🇻🇪", codes: ["VE"] },
  { dial: "84", code: "VN", name: "Vietnam", shortName: "Vietnam", flag: "🇻🇳", codes: ["VN"] },
  { dial: "681", code: "WF", name: "Wallis & Futuna", shortName: "Wallis & Futuna", flag: "🇼🇫", codes: ["WF"] },
  { dial: "967", code: "YE", name: "Yemen", shortName: "Yemen", flag: "🇾🇪", codes: ["YE"] },
  { dial: "260", code: "ZM", name: "Zambia", shortName: "Zambia", flag: "🇿🇲", codes: ["ZM"] },
  { dial: "263", code: "ZW", name: "Zimbabwe", shortName: "Zimbabwe", flag: "🇿🇼", codes: ["ZW"] },
];

/** The same rows, longest calling code FIRST — a prefix match must try the
 *  longest code first, or +971 would be read as +97 and then +9. */
export const PHONE_COUNTRIES_BY_DIAL = [...PHONE_COUNTRIES].sort(
  (a, b) => b.dial.length - a.dial.length,
);

/** ISO alpha-2 → emoji flag (regional indicator symbols). */
export function countryFlagEmoji(iso) {
  return [...iso.toUpperCase()]
    .map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)))
    .join("");
}

/**
 * The country a phone number belongs to, or null when the number carries no
 * country code. The number must be E.164 (an explicit "+" then the calling
 * code): a bare number has no country code in it, so there is nothing to
 * read. Longest-prefix wins; never guesses.
 */
export function phoneCountryOf(phone) {
  if (!phone) return null;
  const raw = String(phone).trim();
  if (!raw.startsWith("+")) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  for (const c of PHONE_COUNTRIES_BY_DIAL) {
    if (digits.startsWith(c.dial)) return c;
  }
  return null;
}
