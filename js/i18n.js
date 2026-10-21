/* Retro9: texts in English, French, Spanish and Arabic ({name} and {date} are filled in). */
var R9Text = {
    en: {
        recent: 'Continue playing', fav: 'Favourites', library: 'Library', open: 'Open', back: 'Back', options: 'Options',
        favourite: 'Favourite', switchLib: 'Library', loading: 'Loading…', loadingGame: 'Starting {name}…', empty: 'No games here.',
        noLib: 'This library could not be read. Check its address in the app config.', retry: 'Try again',
        noRepos: 'No library is set. Add one in the App Store Manager, Config.', play: 'Play', cont: 'Continue where you left off',
        fresh: 'Start fresh', contTitle: 'Continue?', contText: 'Auto-saved {date}.', loadQuick: 'Play from the quick save',
        addFav: 'Add to favourites', remFav: 'Remove from favourites', delSaves: 'Delete this game\'s saves', deleted: 'Saves deleted',
        saved: 'State saved', notSaved: 'This game cannot save a state', loaded: 'State loaded', noQuick: 'No quick save yet',
        qsave: 'Save state', qload: 'Load state', pstart: 'Press Start', pselect: 'Press Select', restart: 'Restart game',
        exit: 'Exit to library', reload: 'Reload library', off: 'This system is turned off in the app config',
        failRom: 'Could not download this game', failEmu: 'The emulator could not start this game', cancel: 'Cancel',
        update: 'Update My PC to use game controllers in Retro9', favOn: 'Added to favourites', favOff: 'Removed from favourites',
        pad: 'Best played with a game controller or the phone controller'
    },
    fr: {
        recent: 'Continuer à jouer', fav: 'Favoris', library: 'Bibliothèque', open: 'Ouvrir', back: 'Retour', options: 'Options',
        favourite: 'Favori', switchLib: 'Bibliothèque', loading: 'Chargement…', loadingGame: 'Lancement de {name}…', empty: 'Aucun jeu ici.',
        noLib: 'Impossible de lire cette bibliothèque. Vérifiez son adresse dans la configuration.', retry: 'Réessayer',
        noRepos: 'Aucune bibliothèque. Ajoutez-en une dans l\'App Store Manager, Config.', play: 'Jouer', cont: 'Reprendre où vous en étiez',
        fresh: 'Nouvelle partie', contTitle: 'Reprendre ?', contText: 'Sauvegarde automatique du {date}.', loadQuick: 'Jouer depuis la sauvegarde rapide',
        addFav: 'Ajouter aux favoris', remFav: 'Retirer des favoris', delSaves: 'Effacer les sauvegardes de ce jeu', deleted: 'Sauvegardes effacées',
        saved: 'État sauvegardé', notSaved: 'Ce jeu ne peut pas sauvegarder d\'état', loaded: 'État chargé', noQuick: 'Pas encore de sauvegarde rapide',
        qsave: 'Sauvegarder l\'état', qload: 'Charger l\'état', pstart: 'Appuyer sur Start', pselect: 'Appuyer sur Select', restart: 'Recommencer',
        exit: 'Retour à la bibliothèque', reload: 'Recharger la bibliothèque', off: 'Ce système est désactivé dans la configuration',
        failRom: 'Impossible de télécharger ce jeu', failEmu: 'L\'émulateur n\'a pas pu lancer ce jeu', cancel: 'Annuler',
        update: 'Mettez à jour My PC pour utiliser les manettes dans Retro9', favOn: 'Ajouté aux favoris', favOff: 'Retiré des favoris',
        pad: 'À jouer avec une manette ou le téléphone'
    },
    es: {
        recent: 'Seguir jugando', fav: 'Favoritos', library: 'Biblioteca', open: 'Abrir', back: 'Atrás', options: 'Opciones',
        favourite: 'Favorito', switchLib: 'Biblioteca', loading: 'Cargando…', loadingGame: 'Iniciando {name}…', empty: 'No hay juegos aquí.',
        noLib: 'No se pudo leer esta biblioteca. Revisa su dirección en la configuración.', retry: 'Reintentar',
        noRepos: 'No hay biblioteca. Añade una en el App Store Manager, Config.', play: 'Jugar', cont: 'Seguir donde lo dejaste',
        fresh: 'Empezar de nuevo', contTitle: '¿Continuar?', contText: 'Guardado automático del {date}.', loadQuick: 'Jugar desde el guardado rápido',
        addFav: 'Añadir a favoritos', remFav: 'Quitar de favoritos', delSaves: 'Borrar los guardados de este juego', deleted: 'Guardados borrados',
        saved: 'Estado guardado', notSaved: 'Este juego no puede guardar estados', loaded: 'Estado cargado', noQuick: 'Aún no hay guardado rápido',
        qsave: 'Guardar estado', qload: 'Cargar estado', pstart: 'Pulsar Start', pselect: 'Pulsar Select', restart: 'Reiniciar juego',
        exit: 'Volver a la biblioteca', reload: 'Recargar biblioteca', off: 'Este sistema está desactivado en la configuración',
        failRom: 'No se pudo descargar este juego', failEmu: 'El emulador no pudo iniciar este juego', cancel: 'Cancelar',
        update: 'Actualiza My PC para usar mandos en Retro9', favOn: 'Añadido a favoritos', favOff: 'Quitado de favoritos',
        pad: 'Mejor con un mando o con el teléfono'
    },
    ar: {
        recent: 'متابعة اللعب', fav: 'المفضلة', library: 'المكتبة', open: 'فتح', back: 'رجوع', options: 'خيارات',
        favourite: 'مفضلة', switchLib: 'المكتبة', loading: 'جارٍ التحميل…', loadingGame: 'جارٍ تشغيل {name}…', empty: 'لا توجد ألعاب هنا.',
        noLib: 'تعذرت قراءة هذه المكتبة. تحقق من عنوانها في إعدادات التطبيق.', retry: 'إعادة المحاولة',
        noRepos: 'لا توجد مكتبة. أضف واحدة في App Store Manager، Config.', play: 'العب', cont: 'تابع من حيث توقفت',
        fresh: 'ابدأ من جديد', contTitle: 'متابعة؟', contText: 'حفظ تلقائي {date}.', loadQuick: 'العب من الحفظ السريع',
        addFav: 'أضف إلى المفضلة', remFav: 'أزل من المفضلة', delSaves: 'احذف حفظ هذه اللعبة', deleted: 'تم حذف الحفظ',
        saved: 'تم الحفظ', notSaved: 'لا يمكن لهذه اللعبة حفظ الحالة', loaded: 'تم التحميل', noQuick: 'لا يوجد حفظ سريع بعد',
        qsave: 'حفظ الحالة', qload: 'تحميل الحالة', pstart: 'اضغط Start', pselect: 'اضغط Select', restart: 'أعد اللعبة',
        exit: 'العودة إلى المكتبة', reload: 'إعادة تحميل المكتبة', off: 'هذا النظام متوقف في إعدادات التطبيق',
        failRom: 'تعذر تنزيل هذه اللعبة', failEmu: 'تعذر على المحاكي تشغيل هذه اللعبة', cancel: 'إلغاء',
        update: 'حدّث My PC لاستخدام أذرع التحكم في Retro9', favOn: 'أضيفت إلى المفضلة', favOff: 'أزيلت من المفضلة',
        pad: 'الأفضل اللعب بذراع تحكم أو بالهاتف'
    }
};
