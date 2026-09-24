import { Session } from '@supabase/supabase-js';

export interface Listing {
  id: number;
  title: string;
  price: number;
  description: string;
  image_url?: string | null;
  images?: string[];
  seller_id: string;
  seller_name?: string;
  category?: string;
  location?: string;
  created_at?: string;
  condition?: string;
  views?: number;
}

export interface ConversationItem {
  listing: Listing;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  last_message: string;
  unread_count: number;
  last_message_time?: string;
}

export interface ChatProps {
  session: Session;
  listing: Listing;
  onBack: () => void;
  theme: any;
  t: any;
  onViewListingDetails?: (item: Listing) => void;
}

export interface DetailProps {
  session: Session | null;
  listing: Listing;
  onBack: () => void;
  onChat: (listing: Listing) => void;
  onViewSeller: (id: string) => void;
  isOwner: boolean;
  theme: any;
  t: any;
  onReqLogin: () => void;
  onViewDetails?: (item: Listing) => void;
  onStatusChange?: (listingId: number, newCondition: string) => void;
}

export interface EditProps {
  session: Session;
  listing: Listing;
  onBack: () => void;
  onSuccess: (updatedItem?: Listing) => void;
  theme: any;
  t: any;
}

export interface SellScreenProps {
  session: Session | null;
  onSuccess: () => void;
  theme: any;
  t: any;
  onReqLogin: () => void;
}

export interface HomeScreenProps {
  session: Session | null;
  onChat: (item: Listing) => void;
  onViewDetails: (item: Listing) => void;
  theme: any;
  t: any;
  lang: string;
}

export interface ChatListScreenProps {
  session: Session | null;
  onSelect: (l: Listing) => void;
  theme: any;
  t: any;
  onReqLogin: () => void;
  isVisible: boolean;
}

export interface ProfileScreenProps {
  session: Session | null;
  onViewDetails: (item: Listing) => void;
  onEdit: (item: Listing) => void;
  onLogout: () => void;
  theme: any;
  setThemeMode: (mode: 'light' | 'dark') => void;
  lang: 'sq' | 'en';
  setLang: (l: 'sq' | 'en') => void;
  t: any;
  onReqLogin: () => void;
  onJoin: () => void;
  onProfileUpdated?: () => void;
}

export interface SellerProfileProps {
  sellerId: string;
  onBack: () => void;
  onViewDetails: (item: Listing) => void;
  theme: any;
  t: any;
  session?: Session | null;
  onReqLogin?: () => void;
}

export interface AuthScreenProps {
  onLoginSuccess: () => void;
  onGuestLogin: () => void;
  theme: any;
  t: any;
  lang: 'sq' | 'en';
  setLang: (l: 'sq' | 'en') => void;
}

export type NavItem =
  | { type: 'listing'; listing: Listing; isEditing?: boolean }
  | { type: 'seller'; sellerId: string }
  | { type: 'chat'; listing: Listing };

export const TRANSLATIONS = {
  sq: {
    tab_home: 'Ballina', home: 'Shtëpi', sell: 'Shit', chats: 'Bisedat', profile: 'Profili', searchPlaceholder: 'Çfarë po kërkoni sot?', all: 'Të gjitha',
    electronics: 'Elektronikë', clothing: 'Veshje', pets: 'Kafshë shtëpiake', sports: 'Sport', vehicles: 'Automjete', services: 'Shërbime', free: 'Falas', other: 'Tjetër',
    noListings: 'Nuk u gjet asnjë postim.', sellTitle: 'Shit Produkt', photos: 'Fotot e produktit', add: 'Shto', details: 'Detajet', titlePlaceholder: 'Titulli (psh. iPhone 13)', pricePlaceholder: 'Çmimi (€)', category: 'Kategoria', location: 'Qyteti', description: 'Përshkrimi', descPlaceholder: 'Përshkruaj produktin...', publish: 'Publiko Tani', myChats: 'Bisedat', noChats: 'Asnjë bisedë ende.', editProfile: 'Ndrysho Profilin', logout: 'Dil', myListings: 'Postimet e mia', favorites: 'Të Ruajturat', save: 'Ruaj', namePlaceholder: 'Emri juaj', newUser: 'Përdorues i Ri', chatNew: 'Bisedë e re', soldBy: 'Shitur nga', unknown: 'I Panjohur', sendMessage: 'Dërgo Mesazh', yourListing: 'Postimi juaj', edit: 'Ndrysho', delete: 'Fshi', deleteConfirm: 'A jeni i sigurt?', yes: 'Po', no: 'Jo', success: 'Sukses', error: 'Gabim', settings: 'Cilësimet', darkMode: 'Modaliteti i Errët', language: 'Gjuha', changeLang: 'Ndrysho Gjuhën', cancel: 'Anulo',
    loginTitle: 'Mirësevini në NearBuy', loginSubtitle: 'Mirësevini në NearBuy', email: 'Email', emailOrUser: 'Email ose Username', password: 'Fjalëkalimi', confirmPass: 'Konfirmo Fjalëkalimin', username: 'Username', continue: 'Vazhdo', loginSuccess: 'Hyrja me sukses!', signupSuccess: 'Llogaria u krijua! Kontrolloni emailin.', fillFields: 'Plotesoni fushat.', passMismatch: 'Fjalëkalimet nuk përputhen.', selectPhoto: 'Zgjidhni foto.', postCreated: 'Postimi u krijua!', postUpdated: 'Postimi u përditësua!', saving: 'Duke ruajtur...', camera: 'Kamera', gallery: 'Galeria', chooseSource: 'Zgjidhni metodën:', permissionMissing: 'Leja mungon', loading: 'Duke ngarkuar...', noDesc: 'Nuk ka përshkrim.', selectCity: 'Zgjidh Qytetin', filterCity: 'Filtro Qytetet', apply: 'Apliko', postedOn: 'Postuar:',
    loginButton: 'Hyni', signupButton: 'Regjistrohuni', switchToSignup: 'Nuk keni llogari? Regjistrohuni', switchToLogin: 'Keni llogari? Hyni', guest: 'Vazhdo si vizitor', loginReq: 'Kërkohet Llogari', loginReqDesc: 'Duhet të keni llogari për të përdorur këtë opsion.', condition: 'Gjendja', conditionNew: 'I ri', conditionUsed: 'I përdorur', guestSellTitle: 'Filloni të shisni', guestSellDesc: 'Krijoni një llogari për të postuar produktet tuaja.', guestChatTitle: 'Bisedoni me shitësit', guestChatDesc: 'Kyçuni për të dërguar mesazhe.', loginOrSignup: 'Hyni ose Regjistrohuni',
    noMyListings: 'Nuk keni postime.', noFavorites: 'Nuk keni postime të ruajtura.',
    bio: 'Biografia', bioPlaceholder: 'Tregoni diçka për veten...', phone: 'Numri Telefonit', city: 'Qyteti',
    sellerProfile: 'Profili i Shitësit', noSellerListings: 'Asnjë postim aktiv nga ky shitës.', listingOf: 'Postimet e',
    searchWithPhoto: 'Kërko me Foto', chooseMethod: 'Zgjidhni metodën:', results: 'Rezultati',
    selectKeyword: 'Zgjidhni fjalën kyçe për kërkim:', searchBtn: 'Kërko:',
    today: 'Sot', yesterday: 'Dje', select: 'Selekto',
    unread: 'Të palexuara', buying: 'Blerje', selling: 'Shitje', searchChats: 'Kërko biseda...',
    visualEffect: 'E pamundur', noObjectFound: 'Nuk u gjet asnjë objekt i qartë në foto.',
    forgotPassword: 'Keni harruar fjalëkalimin?', resetPassword: 'Rivendos Fjalëkalimin', sendResetLink: 'Dërgo Linkun', emailForReset: 'Shkruani emailin tuaj për të marrë linkun e rivendosjes.', resetLinkSent: 'Linku u dërgua! Kontrolloni emailin.', resetLinkError: 'Gabim gjatë dërgimit.', backToLogin: 'Kthehu te Hyrja',
    months: ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'],
    days: ['E Diel', 'E Hënë', 'E Martë', 'E Mërkurë', 'E Enjte', 'E Premte', 'E Shtunë'],
    filters: 'Filtra', pricePrice: 'Çmimi', minPrice: 'Min', maxPrice: 'Max', sortBy: 'Rendit sipas', sortNewest: 'Më të rejat', sortOldest: 'Më të vjetrat', sortPriceLow: 'Çmimi: Ulët -> Lartë', sortPriceHigh: 'Çmimi: Lartë -> Ulët', reset: 'Pastro',
    recentSearches: 'Kërkimet e fundit', clearHistory: 'Fshi të gjitha', noRecentSearches: 'Nuk keni kërkime të fundit',
    markAsSold: 'Shëno si të shitur', markAsActive: 'Rikthe në shitje', isSold: 'I SHITUR', productSoldBanner: 'Ky produkt është shitur', callSeller: 'Telefono', whatsapp: 'WhatsApp', share: 'Shpërndaj', similarProducts: 'Produkte të ngjashme', noPhoneTitle: 'Nuk ka numër', noPhoneDesc: 'Shitësi nuk ka vendosur numër telefoni.', phonePlaceholder: 'Numri i telefonit (psh. 049 111 111 ose +383 49 111 111)', confirmSoldTitle: 'Shëno si të shitur', confirmSoldDesc: 'A jeni i sigurt që ky produkt është shitur? Do të shfaqet me shënimin "I SHITUR".', confirmActiveTitle: 'Rikthe në shitje', confirmActiveDesc: 'A dëshironi ta riktheni këtë produkt si aktiv në shitje?',
    pricePlaceholderServices: 'Çmimi (€) - Opsionale',
    views: 'shikime', report: 'Raporto', reportListing: 'Raporto Shpalljen',
    reportReasonDesc: 'Zgjidhni arsyen pse po e raportoni këtë shpallje:',
    reportDetailsPlaceholder: 'Detaje shtesë (opsionale)...',
    sendReport: 'Dërgo Raportimin',
    reportSuccessTitle: 'Faleminderit!',
    reportSuccessDesc: 'Raportimi juaj u dërgua me sukses dhe do të shqyrtohet nga ekipi ynë.',
    selectReason: 'Zgjidhni një arsye para se ta dërgoni.',
    reasonFraud: 'Mashtrim ose çmim i rremë',
    reasonSpam: 'Spam ose shpallje e dyfishtë',
    reasonProhibited: 'Produkt i ndaluar / i rrezikshëm',
    reasonIncorrect: 'Përshkrim ose foto të pasakta',
    reasonUnreachable: 'Shitësi nuk përgjigjet / numër i pasaktë',
    reasonOther: 'Arsye tjetër',
    rateSeller: 'Vlerëso Shitësin', reviewsTitle: 'Vlerësimet', noReviews: 'I Ri',
    rateTitle: 'Vlerëso Përvojën', ratePrompt: 'Sa yje i jepni këtij shitësi?',
    reviewPlaceholder: 'Shkruani përshtypjen tuaj (opsionale)...',
    sendReview: 'Dërgo Vlerësimin', reviewSuccessTitle: 'Faleminderit!',
    reviewSuccessDesc: 'Vlerësimi juaj u ruajt me sukses.',
    notifications: 'Njoftimet',
    pushNotificationsDesc: 'Merr njoftime kur të vijnë mesazhe të reja',
    changePasswordBtn: 'Ndrysho Fjalëkalimin',
    changePasswordDesc: 'Dërgo email për rivendosjen e fjalëkalimit',
    clearHistoryBtn: 'Pastro Historikun e Kërkimeve',
    historyCleared: 'Historiku i kërkimeve u fshi me sukses.',
    helpAndSupport: 'Ndihmë & Suport',
    contactSupport: 'Na kontaktoni në WhatsApp ose Email',
    aboutApp: 'Rreth Aplikacionit',
    appVersion: 'NearBuy Kosovë v1.0.0',
    allRightsReserved: 'Të gjitha të drejtat e rezervuara © 2026',
    dangerZone: 'Zona e Rrezikut',
    deleteAccountBtn: 'Fshi Llogarinë',
    deleteAccountConfirmTitle: 'Fshirja e Llogarisë',
    deleteAccountConfirmDesc: 'A jeni plotësisht i sigurt? Ky veprim do të fshijë llogarinë tuaj dhe të gjitha shpalljet përgjithmonë.',
    accountDeletedTitle: 'Llogaria u fshi',
    accountDeletedDesc: 'Llogaria juaj është fshirë me sukses.',
    activeListingsCount: 'Aktive',
    soldListingsCount: 'Të Shitura',
    sellerRatingLabel: 'Vlerësimi',
    selectYourCity: 'Zgjidhni qytetin tuaj',
    shareMessageIntro: 'Shiko këtë shpallje në NearBuy:',
    defaultCountry: 'Kosovë',
    whatsappIntro: 'Përshëndetje! Po ju kontaktoj nga NearBuy në lidhje me shpalljen tuaj:',
    whatsappOpenError: 'Nuk mund të hapet WhatsApp. Sigurohuni që e keni të instaluar aplikacionin.',
    rateLimitExceeded: 'Keni tejkaluar limitin e dërgimit të emaileve (Email rate limit). Ju lutem prisni pak kohë para se të provoni përsëri ose kontaktoni suportin.',
    rateLimitCooldown: 'Keni kryer shumë kërkesa brenda një kohe të shkurtër. Ju lutem prisni {seconds} sekonda para se të provoni përsëri.',
    invalidEmail: 'Ju lutem vendosni një adresë emaili të vlefshme.',
    passwordTooShort: 'Fjalëkalimi duhet të ketë së paku 6 karaktere.',
    selfChatError: 'Nuk mund të bisedoni me veten për shpalljen tuaj.',
    selfReviewError: 'Nuk mund të vlerësoni veten tuaj.',
    unauthorizedAction: 'Veprim i paautorizuar. Nuk keni leje për këtë shpallje.',
    invalidPrice: 'Çmimi nuk është i vlefshëm.',
  },
  en: {
    tab_home: 'Home', home: 'Home & Garden', sell: 'Sell', chats: 'Chats', profile: 'Profile', searchPlaceholder: 'What are you looking for?', all: 'All',
    electronics: 'Electronics', clothing: 'Clothing', pets: 'Pets', sports: 'Sports', vehicles: 'Vehicles', services: 'Services', free: 'Free', other: 'Other',
    noListings: 'No listings found.', sellTitle: 'Sell Product', photos: 'Product Photos', add: 'Add', details: 'Details', titlePlaceholder: 'Title (e.g. iPhone 13)', pricePlaceholder: 'Price (€)', category: 'Category', location: 'City', description: 'Description', descPlaceholder: 'Describe the product...', publish: 'Publish Now', myChats: 'Chats', noChats: 'No chats yet.', editProfile: 'Edit Profile', logout: 'Logout', myListings: 'My Listings', favorites: 'Saved', save: 'Save', namePlaceholder: 'Your Name', newUser: 'New User', chatNew: 'New Chat', soldBy: 'Sold by', unknown: 'Unknown', sendMessage: 'Send Message', yourListing: 'Your Listing', edit: 'Edit', delete: 'Delete', deleteConfirm: 'Are you sure?', yes: 'Yes', no: 'No', success: 'Success', error: 'Error', settings: 'Settings', darkMode: 'Dark Mode', language: 'Language', changeLang: 'Change Language', cancel: 'Cancel',
    loginTitle: 'Welcome to NearBuy', loginSubtitle: 'Welcome to NearBuy', email: 'Email', emailOrUser: 'Email or Username', password: 'Password', confirmPass: 'Confirm Password', username: 'Username', continue: 'Continue', loginSuccess: 'Login successful!', signupSuccess: 'Account created! Check email.', fillFields: 'Fill all fields.', passMismatch: 'Passwords do not match.', selectPhoto: 'Select photo.', postCreated: 'Listing created!', postUpdated: 'Listing updated!', saving: 'Saving...', camera: 'Camera', gallery: 'Gallery', chooseSource: 'Choose source:', permissionMissing: 'Permission missing', loading: 'Loading...', noDesc: 'No description.', selectCity: 'Select City', filterCity: 'Filter Cities', apply: 'Apply', postedOn: 'Posted on',
    loginButton: 'Login', signupButton: 'Sign Up', switchToSignup: "Don't have an account? Sign Up", switchToLogin: 'Have an account? Login', guest: 'Continue as Guest', loginReq: 'Login Required', loginReqDesc: 'You need an account to perform this action.', condition: 'Condition', conditionNew: 'New', conditionUsed: 'Used', guestSellTitle: 'Start Selling', guestSellDesc: 'Create an account to post your products.', guestChatTitle: 'Chat with Sellers', guestChatDesc: 'Login to send messages.', loginOrSignup: 'Login or Sign Up',
    noMyListings: 'You have no listings.', noFavorites: 'No saved items.',
    bio: 'Bio', bioPlaceholder: 'Tell us about yourself...', phone: 'Phone Number', city: 'City',
    sellerProfile: 'Seller Profile', noSellerListings: 'No active listings from this seller.', listingOf: 'Listings of',
    searchWithPhoto: 'Search with Photo', chooseMethod: 'Choose method:', results: 'Results',
    selectKeyword: 'Select keyword to search:', searchBtn: 'Search:',
    today: 'Today', yesterday: 'Yesterday', select: 'Select',
    unread: 'Unread', buying: 'Buying', selling: 'Selling', searchChats: 'Search chats...',
    visualEffect: 'Impossible', noObjectFound: 'No clear object found in photo.',
    forgotPassword: 'Forgot Password?', resetPassword: 'Reset Password', sendResetLink: 'Send Reset Link', emailForReset: 'Enter your email to receive a reset link.', resetLinkSent: 'Reset link sent! Check your email.', resetLinkError: 'Error sending reset link.', backToLogin: 'Back to Login',
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    filters: 'Filters', pricePrice: 'Price', minPrice: 'Min', maxPrice: 'Max', sortBy: 'Sort by', sortNewest: 'Newest', sortOldest: 'Oldest', sortPriceLow: 'Price: Low -> High', sortPriceHigh: 'Price: High -> Low', reset: 'Reset',
    recentSearches: 'Recent searches', clearHistory: 'Clear all', noRecentSearches: 'No recent searches',
    markAsSold: 'Mark as sold', markAsActive: 'Mark as active', isSold: 'SOLD', productSoldBanner: 'This item has been sold', callSeller: 'Call', whatsapp: 'WhatsApp', share: 'Share', similarProducts: 'Similar products', noPhoneTitle: 'No phone number', noPhoneDesc: 'Seller has not provided a phone number.', phonePlaceholder: 'Phone number (e.g. 049 111 111 or +383 49 111 111)', confirmSoldTitle: 'Mark as sold', confirmSoldDesc: 'Are you sure this product is sold? It will be shown with a "SOLD" badge.', confirmActiveTitle: 'Mark as active', confirmActiveDesc: 'Do you want to restore this item as active for sale?',
    pricePlaceholderServices: 'Price (€) - Optional',
    views: 'views', report: 'Report', reportListing: 'Report Listing',
    reportReasonDesc: 'Select the reason why you are reporting this listing:',
    reportDetailsPlaceholder: 'Additional details (optional)...',
    sendReport: 'Submit Report',
    reportSuccessTitle: 'Thank you!',
    reportSuccessDesc: 'Your report has been submitted and will be reviewed shortly.',
    selectReason: 'Please select a reason before submitting.',
    reasonFraud: 'Fraud or fake price',
    reasonSpam: 'Spam or duplicate listing',
    reasonProhibited: 'Prohibited or dangerous item',
    reasonIncorrect: 'Incorrect description or photos',
    reasonUnreachable: 'Seller unreachable / wrong number',
    reasonOther: 'Other reason',
    rateSeller: 'Rate Seller', reviewsTitle: 'Reviews', noReviews: 'New',
    rateTitle: 'Rate Experience', ratePrompt: 'How many stars do you give this seller?',
    reviewPlaceholder: 'Write your feedback (optional)...',
    sendReview: 'Submit Review', reviewSuccessTitle: 'Thank you!',
    reviewSuccessDesc: 'Your review has been saved successfully.',
    notifications: 'Notifications',
    pushNotificationsDesc: 'Get alerts when you receive new messages',
    changePasswordBtn: 'Change Password',
    changePasswordDesc: 'Send password reset link to your email',
    clearHistoryBtn: 'Clear Search History',
    historyCleared: 'Search history cleared successfully.',
    helpAndSupport: 'Help & Support',
    contactSupport: 'Contact us via WhatsApp or Email',
    aboutApp: 'About NearBuy',
    appVersion: 'NearBuy Kosovo v1.0.0',
    allRightsReserved: 'All rights reserved © 2026',
    dangerZone: 'Danger Zone',
    deleteAccountBtn: 'Delete Account',
    deleteAccountConfirmTitle: 'Delete Account',
    deleteAccountConfirmDesc: 'Are you completely sure? This will permanently delete your account and all your listings.',
    accountDeletedTitle: 'Account Deleted',
    accountDeletedDesc: 'Your account has been deleted successfully.',
    activeListingsCount: 'Active',
    soldListingsCount: 'Sold',
    sellerRatingLabel: 'Rating',
    selectYourCity: 'Select your city',
    shareMessageIntro: 'Check out this listing on NearBuy:',
    defaultCountry: 'Kosovo',
    whatsappIntro: 'Hello! I am contacting you from NearBuy regarding your listing:',
    whatsappOpenError: 'Cannot open WhatsApp. Please make sure the app is installed.',
    rateLimitExceeded: 'Email rate limit exceeded. Please wait a few minutes before trying again.',
    rateLimitCooldown: 'Too many requests. Please wait {seconds} seconds before trying again.',
    invalidEmail: 'Please enter a valid email address.',
    passwordTooShort: 'Password must be at least 6 characters long.',
    selfChatError: 'You cannot chat with yourself on your own listing.',
    selfReviewError: 'You cannot review your own profile.',
    unauthorizedAction: 'Unauthorized action. You do not have permission for this listing.',
    invalidPrice: 'Price is not valid.',
  }
};
