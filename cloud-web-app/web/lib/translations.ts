/**
 * AETHEL ENGINE - i18n Translations
 * 
 * Complete translation files for all supported languages.
 * Covers entire IDE interface, marketplace, and engine features.
 */

export interface TranslationStrings {
    // Common
    common: {
        save: string;
        cancel: string;
        delete: string;
        edit: string;
        create: string;
        open: string;
        close: string;
        search: string;
        filter: string;
        sort: string;
        loading: string;
        error: string;
        success: string;
        warning: string;
        info: string;
        confirm: string;
        yes: string;
        no: string;
        ok: string;
        apply: string;
        reset: string;
        undo: string;
        redo: string;
        copy: string;
        paste: string;
        cut: string;
        duplicate: string;
        rename: string;
        refresh: string;
        settings: string;
        help: string;
        about: string;
        version: string;
        language: string;
        theme: string;
        dark: string;
        light: string;
        system: string;
    };
    
    // Menu
    menu: {
        file: string;
        newProject: string;
        openProject: string;
        saveProject: string;
        saveAs: string;
        export: string;
        import: string;
        recentProjects: string;
        exit: string;
        
        edit: string;
        selectAll: string;
        deselectAll: string;
        preferences: string;
        
        view: string;
        viewport: string;
        panels: string;
        fullscreen: string;
        resetLayout: string;
        
        project: string;
        projectSettings: string;
        buildSettings: string;
        build: string;
        buildAndRun: string;
        cleanBuild: string;
        
        tools: string;
        packageManager: string;
        pluginManager: string;
        console: string;
        profiler: string;
        
        help: string;
        documentation: string;
        tutorials: string;
        reportBug: string;
        checkUpdates: string;
    };
    
    // Panels
    panels: {
        hierarchy: string;
        inspector: string;
        project: string;
        console: string;
        animation: string;
        timeline: string;
        assets: string;
        materials: string;
        layers: string;
        properties: string;
        nodeEditor: string;
        scriptEditor: string;
    };
    
    // Viewport
    viewport: {
        perspective: string;
        orthographic: string;
        top: string;
        bottom: string;
        front: string;
        back: string;
        left: string;
        right: string;
        wireframe: string;
        solid: string;
        textured: string;
        rendered: string;
        grid: string;
        snap: string;
        gizmo: string;
        translate: string;
        rotate: string;
        scale: string;
        local: string;
        global: string;
        pivot: string;
        center: string;
    };
    
    // Scene
    scene: {
        newScene: string;
        loadScene: string;
        saveScene: string;
        sceneSettings: string;
        addObject: string;
        empty: string;
        cube: string;
        sphere: string;
        cylinder: string;
        plane: string;
        camera: string;
        light: string;
        directionalLight: string;
        pointLight: string;
        spotLight: string;
        areaLight: string;
        ambientLight: string;
        group: string;
        prefab: string;
    };
    
    // Inspector
    inspector: {
        transform: string;
        position: string;
        rotation: string;
        scale: string;
        mesh: string;
        material: string;
        physics: string;
        rigidbody: string;
        collider: string;
        script: string;
        addComponent: string;
        removeComponent: string;
        enabled: string;
        disabled: string;
        static: string;
        dynamic: string;
        kinematic: string;
        mass: string;
        friction: string;
        bounciness: string;
        drag: string;
        angularDrag: string;
        useGravity: string;
        isTrigger: string;
    };
    
    // Assets
    assets: {
        import: string;
        refresh: string;
        createFolder: string;
        createMaterial: string;
        createScript: string;
        createPrefab: string;
        createAnimation: string;
        createShader: string;
        showInExplorer: string;
        reimport: string;
        delete: string;
        rename: string;
        copy: string;
        paste: string;
        duplicate: string;
        findReferences: string;
        models: string;
        textures: string;
        audio: string;
        scripts: string;
        materials: string;
        prefabs: string;
        scenes: string;
        animations: string;
        shaders: string;
        fonts: string;
    };
    
    // Materials
    materials: {
        newMaterial: string;
        albedo: string;
        normal: string;
        roughness: string;
        metallic: string;
        emission: string;
        occlusion: string;
        height: string;
        opacity: string;
        tiling: string;
        offset: string;
        shader: string;
        renderQueue: string;
        doubleSided: string;
        transparent: string;
        alphaClip: string;
    };
    
    // Animation
    animation: {
        play: string;
        pause: string;
        stop: string;
        loop: string;
        speed: string;
        keyframe: string;
        addKeyframe: string;
        deleteKeyframe: string;
        curve: string;
        linear: string;
        bezier: string;
        constant: string;
        record: string;
        preview: string;
        blend: string;
        transition: string;
    };
    
    // Physics
    physics: {
        gravity: string;
        simulate: string;
        pause: string;
        step: string;
        collisionLayers: string;
        raycast: string;
        overlap: string;
    };
    
    // Lighting
    lighting: {
        intensity: string;
        color: string;
        range: string;
        spotAngle: string;
        shadows: string;
        shadowType: string;
        hard: string;
        soft: string;
        none: string;
        shadowResolution: string;
        bias: string;
        normalBias: string;
        bakeLighting: string;
        realtime: string;
        baked: string;
        mixed: string;
    };
    
    // Rendering
    rendering: {
        quality: string;
        resolution: string;
        antiAliasing: string;
        shadows: string;
        bloom: string;
        ambientOcclusion: string;
        motionBlur: string;
        depthOfField: string;
        colorGrading: string;
        toneMappimg: string;
        exposure: string;
        vignette: string;
        chromaticAberration: string;
        fog: string;
        skybox: string;
        reflections: string;
    };
    
    // Build
    build: {
        platform: string;
        windows: string;
        mac: string;
        linux: string;
        webgl: string;
        android: string;
        ios: string;
        targetDirectory: string;
        compression: string;
        development: string;
        release: string;
        debug: string;
        includeSymbols: string;
        buildNumber: string;
        bundleId: string;
        icon: string;
        splash: string;
        startBuilding: string;
        buildComplete: string;
        buildFailed: string;
    };
    
    // Marketplace
    marketplace: {
        title: string;
        browse: string;
        search: string;
        categories: string;
        free: string;
        paid: string;
        featured: string;
        popular: string;
        newest: string;
        myLibrary: string;
        myAssets: string;
        favorites: string;
        purchases: string;
        downloads: string;
        upload: string;
        publish: string;
        price: string;
        rating: string;
        reviews: string;
        download: string;
        addToLibrary: string;
        purchased: string;
        owned: string;
        creator: string;
        license: string;
        compatibility: string;
        fileSize: string;
        version: string;
        lastUpdate: string;
        description: string;
        tags: string;
        preview: string;
        writeReview: string;
        report: string;
    };
    
    // AI
    ai: {
        assistant: string;
        generate: string;
        generating: string;
        prompt: string;
        model: string;
        creativity: string;
        askAnything: string;
        generateCode: string;
        generateTexture: string;
        generateModel: string;
        generateAnimation: string;
        explain: string;
        optimize: string;
        fix: string;
        suggestions: string;
        history: string;
    };
    
    // Collaboration
    collaboration: {
        share: string;
        invite: string;
        collaborators: string;
        online: string;
        offline: string;
        editing: string;
        viewing: string;
        permissions: string;
        owner: string;
        editor: string;
        viewer: string;
        chat: string;
        voice: string;
        cursor: string;
        follow: string;
    };
    
    // Errors
    errors: {
        generic: string;
        networkError: string;
        fileNotFound: string;
        accessDenied: string;
        invalidFormat: string;
        loadFailed: string;
        saveFailed: string;
        importFailed: string;
        exportFailed: string;
        buildFailed: string;
        connectionLost: string;
        authRequired: string;
        quotaExceeded: string;
    };
    
    // Success
    success: {
        saved: string;
        deleted: string;
        imported: string;
        exported: string;
        published: string;
        downloaded: string;
        connected: string;
        updated: string;
    };
}

// ============================================================================
// ENGLISH (en-US)
// ============================================================================

export const en_US: TranslationStrings = {
    common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        create: 'Create',
        open: 'Open',
        close: 'Close',
        search: 'Search',
        filter: 'Filter',
        sort: 'Sort',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        warning: 'Warning',
        info: 'Info',
        confirm: 'Confirm',
        yes: 'Yes',
        no: 'No',
        ok: 'OK',
        apply: 'Apply',
        reset: 'Reset',
        undo: 'Undo',
        redo: 'Redo',
        copy: 'Copy',
        paste: 'Paste',
        cut: 'Cut',
        duplicate: 'Duplicate',
        rename: 'Rename',
        refresh: 'Refresh',
        settings: 'Settings',
        help: 'Help',
        about: 'About',
        version: 'Version',
        language: 'Language',
        theme: 'Theme',
        dark: 'Dark',
        light: 'Light',
        system: 'System'
    },
    
    menu: {
        file: 'File',
        newProject: 'New Project',
        openProject: 'Open Project',
        saveProject: 'Save Project',
        saveAs: 'Save As...',
        export: 'Export',
        import: 'Import',
        recentProjects: 'Recent Projects',
        exit: 'Exit',
        edit: 'Edit',
        selectAll: 'Select All',
        deselectAll: 'Deselect All',
        preferences: 'Preferences',
        view: 'View',
        viewport: 'Viewport',
        panels: 'Panels',
        fullscreen: 'Fullscreen',
        resetLayout: 'Reset Layout',
        project: 'Project',
        projectSettings: 'Project Settings',
        buildSettings: 'Build Settings',
        build: 'Build',
        buildAndRun: 'Build and Run',
        cleanBuild: 'Clean Build',
        tools: 'Tools',
        packageManager: 'Package Manager',
        pluginManager: 'Plugin Manager',
        console: 'Console',
        profiler: 'Profiler',
        help: 'Help',
        documentation: 'Documentation',
        tutorials: 'Tutorials',
        reportBug: 'Report Bug',
        checkUpdates: 'Check for Updates'
    },
    
    panels: {
        hierarchy: 'Hierarchy',
        inspector: 'Inspector',
        project: 'Project',
        console: 'Console',
        animation: 'Animation',
        timeline: 'Timeline',
        assets: 'Assets',
        materials: 'Materials',
        layers: 'Layers',
        properties: 'Properties',
        nodeEditor: 'Node Editor',
        scriptEditor: 'Script Editor'
    },
    
    viewport: {
        perspective: 'Perspective',
        orthographic: 'Orthographic',
        top: 'Top',
        bottom: 'Bottom',
        front: 'Front',
        back: 'Back',
        left: 'Left',
        right: 'Right',
        wireframe: 'Wireframe',
        solid: 'Solid',
        textured: 'Textured',
        rendered: 'Rendered',
        grid: 'Grid',
        snap: 'Snap',
        gizmo: 'Gizmo',
        translate: 'Translate',
        rotate: 'Rotate',
        scale: 'Scale',
        local: 'Local',
        global: 'Global',
        pivot: 'Pivot',
        center: 'Center'
    },
    
    scene: {
        newScene: 'New Scene',
        loadScene: 'Load Scene',
        saveScene: 'Save Scene',
        sceneSettings: 'Scene Settings',
        addObject: 'Add Object',
        empty: 'Empty',
        cube: 'Cube',
        sphere: 'Sphere',
        cylinder: 'Cylinder',
        plane: 'Plane',
        camera: 'Camera',
        light: 'Light',
        directionalLight: 'Directional Light',
        pointLight: 'Point Light',
        spotLight: 'Spot Light',
        areaLight: 'Area Light',
        ambientLight: 'Ambient Light',
        group: 'Group',
        prefab: 'Prefab'
    },
    
    inspector: {
        transform: 'Transform',
        position: 'Position',
        rotation: 'Rotation',
        scale: 'Scale',
        mesh: 'Mesh',
        material: 'Material',
        physics: 'Physics',
        rigidbody: 'Rigidbody',
        collider: 'Collider',
        script: 'Script',
        addComponent: 'Add Component',
        removeComponent: 'Remove Component',
        enabled: 'Enabled',
        disabled: 'Disabled',
        static: 'Static',
        dynamic: 'Dynamic',
        kinematic: 'Kinematic',
        mass: 'Mass',
        friction: 'Friction',
        bounciness: 'Bounciness',
        drag: 'Drag',
        angularDrag: 'Angular Drag',
        useGravity: 'Use Gravity',
        isTrigger: 'Is Trigger'
    },
    
    assets: {
        import: 'Import',
        refresh: 'Refresh',
        createFolder: 'Create Folder',
        createMaterial: 'Create Material',
        createScript: 'Create Script',
        createPrefab: 'Create Prefab',
        createAnimation: 'Create Animation',
        createShader: 'Create Shader',
        showInExplorer: 'Show in Explorer',
        reimport: 'Reimport',
        delete: 'Delete',
        rename: 'Rename',
        copy: 'Copy',
        paste: 'Paste',
        duplicate: 'Duplicate',
        findReferences: 'Find References',
        models: 'Models',
        textures: 'Textures',
        audio: 'Audio',
        scripts: 'Scripts',
        materials: 'Materials',
        prefabs: 'Prefabs',
        scenes: 'Scenes',
        animations: 'Animations',
        shaders: 'Shaders',
        fonts: 'Fonts'
    },
    
    materials: {
        newMaterial: 'New Material',
        albedo: 'Albedo',
        normal: 'Normal',
        roughness: 'Roughness',
        metallic: 'Metallic',
        emission: 'Emission',
        occlusion: 'Ambient Occlusion',
        height: 'Height',
        opacity: 'Opacity',
        tiling: 'Tiling',
        offset: 'Offset',
        shader: 'Shader',
        renderQueue: 'Render Queue',
        doubleSided: 'Double Sided',
        transparent: 'Transparent',
        alphaClip: 'Alpha Clip'
    },
    
    animation: {
        play: 'Play',
        pause: 'Pause',
        stop: 'Stop',
        loop: 'Loop',
        speed: 'Speed',
        keyframe: 'Keyframe',
        addKeyframe: 'Add Keyframe',
        deleteKeyframe: 'Delete Keyframe',
        curve: 'Curve',
        linear: 'Linear',
        bezier: 'Bezier',
        constant: 'Constant',
        record: 'Record',
        preview: 'Preview',
        blend: 'Blend',
        transition: 'Transition'
    },
    
    physics: {
        gravity: 'Gravity',
        simulate: 'Simulate',
        pause: 'Pause',
        step: 'Step',
        collisionLayers: 'Collision Layers',
        raycast: 'Raycast',
        overlap: 'Overlap'
    },
    
    lighting: {
        intensity: 'Intensity',
        color: 'Color',
        range: 'Range',
        spotAngle: 'Spot Angle',
        shadows: 'Shadows',
        shadowType: 'Shadow Type',
        hard: 'Hard',
        soft: 'Soft',
        none: 'None',
        shadowResolution: 'Shadow Resolution',
        bias: 'Bias',
        normalBias: 'Normal Bias',
        bakeLighting: 'Bake Lighting',
        realtime: 'Realtime',
        baked: 'Baked',
        mixed: 'Mixed'
    },
    
    rendering: {
        quality: 'Quality',
        resolution: 'Resolution',
        antiAliasing: 'Anti-Aliasing',
        shadows: 'Shadows',
        bloom: 'Bloom',
        ambientOcclusion: 'Ambient Occlusion',
        motionBlur: 'Motion Blur',
        depthOfField: 'Depth of Field',
        colorGrading: 'Color Grading',
        toneMappimg: 'Tone Mapping',
        exposure: 'Exposure',
        vignette: 'Vignette',
        chromaticAberration: 'Chromatic Aberration',
        fog: 'Fog',
        skybox: 'Skybox',
        reflections: 'Reflections'
    },
    
    build: {
        platform: 'Platform',
        windows: 'Windows',
        mac: 'macOS',
        linux: 'Linux',
        webgl: 'WebGL',
        android: 'Android',
        ios: 'iOS',
        targetDirectory: 'Target Directory',
        compression: 'Compression',
        development: 'Development',
        release: 'Release',
        debug: 'Debug',
        includeSymbols: 'Include Debug Symbols',
        buildNumber: 'Build Number',
        bundleId: 'Bundle ID',
        icon: 'Icon',
        splash: 'Splash Screen',
        startBuilding: 'Start Building',
        buildComplete: 'Build Complete',
        buildFailed: 'Build Failed'
    },
    
    marketplace: {
        title: 'Marketplace',
        browse: 'Browse',
        search: 'Search assets...',
        categories: 'Categories',
        free: 'Free',
        paid: 'Paid',
        featured: 'Featured',
        popular: 'Popular',
        newest: 'Newest',
        myLibrary: 'My Library',
        myAssets: 'My Assets',
        favorites: 'Favorites',
        purchases: 'Purchases',
        downloads: 'Downloads',
        upload: 'Upload',
        publish: 'Publish',
        price: 'Price',
        rating: 'Rating',
        reviews: 'Reviews',
        download: 'Download',
        addToLibrary: 'Add to Library',
        purchased: 'Purchased',
        owned: 'Owned',
        creator: 'Creator',
        license: 'License',
        compatibility: 'Compatibility',
        fileSize: 'File Size',
        version: 'Version',
        lastUpdate: 'Last Update',
        description: 'Description',
        tags: 'Tags',
        preview: 'Preview',
        writeReview: 'Write a Review',
        report: 'Report'
    },
    
    ai: {
        assistant: 'AI Assistant',
        generate: 'Generate',
        generating: 'Generating...',
        prompt: 'Enter your prompt...',
        model: 'Model',
        creativity: 'Creativity',
        askAnything: 'Ask anything...',
        generateCode: 'Generate Code',
        generateTexture: 'Generate Texture',
        generateModel: 'Generate 3D Model',
        generateAnimation: 'Generate Animation',
        explain: 'Explain',
        optimize: 'Optimize',
        fix: 'Fix',
        suggestions: 'Suggestions',
        history: 'History'
    },
    
    collaboration: {
        share: 'Share',
        invite: 'Invite',
        collaborators: 'Collaborators',
        online: 'Online',
        offline: 'Offline',
        editing: 'Editing',
        viewing: 'Viewing',
        permissions: 'Permissions',
        owner: 'Owner',
        editor: 'Editor',
        viewer: 'Viewer',
        chat: 'Chat',
        voice: 'Voice Chat',
        cursor: 'Show Cursors',
        follow: 'Follow'
    },
    
    errors: {
        generic: 'Something went wrong',
        networkError: 'Network error. Please check your connection.',
        fileNotFound: 'File not found',
        accessDenied: 'Access denied',
        invalidFormat: 'Invalid format',
        loadFailed: 'Failed to load',
        saveFailed: 'Failed to save',
        importFailed: 'Failed to import',
        exportFailed: 'Failed to export',
        buildFailed: 'Build failed',
        connectionLost: 'Connection lost',
        authRequired: 'Authentication required',
        quotaExceeded: 'Storage quota exceeded'
    },
    
    success: {
        saved: 'Saved successfully',
        deleted: 'Deleted successfully',
        imported: 'Imported successfully',
        exported: 'Exported successfully',
        published: 'Published successfully',
        downloaded: 'Downloaded successfully',
        connected: 'Connected',
        updated: 'Updated successfully'
    }
};

// ============================================================================
// PORTUGUESE (pt-BR)
// ============================================================================

export const pt_BR: TranslationStrings = {
    common: {
        save: 'Salvar',
        cancel: 'Cancelar',
        delete: 'Excluir',
        edit: 'Editar',
        create: 'Criar',
        open: 'Abrir',
        close: 'Fechar',
        search: 'Buscar',
        filter: 'Filtrar',
        sort: 'Ordenar',
        loading: 'Carregando...',
        error: 'Erro',
        success: 'Sucesso',
        warning: 'Aviso',
        info: 'Informação',
        confirm: 'Confirmar',
        yes: 'Sim',
        no: 'Não',
        ok: 'OK',
        apply: 'Aplicar',
        reset: 'Redefinir',
        undo: 'Desfazer',
        redo: 'Refazer',
        copy: 'Copiar',
        paste: 'Colar',
        cut: 'Recortar',
        duplicate: 'Duplicar',
        rename: 'Renomear',
        refresh: 'Atualizar',
        settings: 'Configurações',
        help: 'Ajuda',
        about: 'Sobre',
        version: 'Versão',
        language: 'Idioma',
        theme: 'Tema',
        dark: 'Escuro',
        light: 'Claro',
        system: 'Sistema'
    },
    
    menu: {
        file: 'Arquivo',
        newProject: 'Novo Projeto',
        openProject: 'Abrir Projeto',
        saveProject: 'Salvar Projeto',
        saveAs: 'Salvar Como...',
        export: 'Exportar',
        import: 'Importar',
        recentProjects: 'Projetos Recentes',
        exit: 'Sair',
        edit: 'Editar',
        selectAll: 'Selecionar Tudo',
        deselectAll: 'Desmarcar Tudo',
        preferences: 'Preferências',
        view: 'Visualizar',
        viewport: 'Viewport',
        panels: 'Painéis',
        fullscreen: 'Tela Cheia',
        resetLayout: 'Resetar Layout',
        project: 'Projeto',
        projectSettings: 'Configurações do Projeto',
        buildSettings: 'Configurações de Build',
        build: 'Compilar',
        buildAndRun: 'Compilar e Executar',
        cleanBuild: 'Build Limpo',
        tools: 'Ferramentas',
        packageManager: 'Gerenciador de Pacotes',
        pluginManager: 'Gerenciador de Plugins',
        console: 'Console',
        profiler: 'Profiler',
        help: 'Ajuda',
        documentation: 'Documentação',
        tutorials: 'Tutoriais',
        reportBug: 'Reportar Bug',
        checkUpdates: 'Verificar Atualizações'
    },
    
    panels: {
        hierarchy: 'Hierarquia',
        inspector: 'Inspetor',
        project: 'Projeto',
        console: 'Console',
        animation: 'Animação',
        timeline: 'Linha do Tempo',
        assets: 'Assets',
        materials: 'Materiais',
        layers: 'Camadas',
        properties: 'Propriedades',
        nodeEditor: 'Editor de Nós',
        scriptEditor: 'Editor de Scripts'
    },
    
    viewport: {
        perspective: 'Perspectiva',
        orthographic: 'Ortográfica',
        top: 'Superior',
        bottom: 'Inferior',
        front: 'Frontal',
        back: 'Traseira',
        left: 'Esquerda',
        right: 'Direita',
        wireframe: 'Wireframe',
        solid: 'Sólido',
        textured: 'Texturizado',
        rendered: 'Renderizado',
        grid: 'Grade',
        snap: 'Snap',
        gizmo: 'Gizmo',
        translate: 'Mover',
        rotate: 'Rotacionar',
        scale: 'Escalar',
        local: 'Local',
        global: 'Global',
        pivot: 'Pivô',
        center: 'Centro'
    },
    
    scene: {
        newScene: 'Nova Cena',
        loadScene: 'Carregar Cena',
        saveScene: 'Salvar Cena',
        sceneSettings: 'Configurações da Cena',
        addObject: 'Adicionar Objeto',
        empty: 'Vazio',
        cube: 'Cubo',
        sphere: 'Esfera',
        cylinder: 'Cilindro',
        plane: 'Plano',
        camera: 'Câmera',
        light: 'Luz',
        directionalLight: 'Luz Direcional',
        pointLight: 'Luz Pontual',
        spotLight: 'Spot Light',
        areaLight: 'Luz de Área',
        ambientLight: 'Luz Ambiente',
        group: 'Grupo',
        prefab: 'Prefab'
    },
    
    inspector: {
        transform: 'Transformação',
        position: 'Posição',
        rotation: 'Rotação',
        scale: 'Escala',
        mesh: 'Malha',
        material: 'Material',
        physics: 'Física',
        rigidbody: 'Corpo Rígido',
        collider: 'Colisor',
        script: 'Script',
        addComponent: 'Adicionar Componente',
        removeComponent: 'Remover Componente',
        enabled: 'Ativado',
        disabled: 'Desativado',
        static: 'Estático',
        dynamic: 'Dinâmico',
        kinematic: 'Cinemático',
        mass: 'Massa',
        friction: 'Atrito',
        bounciness: 'Elasticidade',
        drag: 'Arrasto',
        angularDrag: 'Arrasto Angular',
        useGravity: 'Usar Gravidade',
        isTrigger: 'É Gatilho'
    },
    
    assets: {
        import: 'Importar',
        refresh: 'Atualizar',
        createFolder: 'Criar Pasta',
        createMaterial: 'Criar Material',
        createScript: 'Criar Script',
        createPrefab: 'Criar Prefab',
        createAnimation: 'Criar Animação',
        createShader: 'Criar Shader',
        showInExplorer: 'Mostrar no Explorer',
        reimport: 'Reimportar',
        delete: 'Excluir',
        rename: 'Renomear',
        copy: 'Copiar',
        paste: 'Colar',
        duplicate: 'Duplicar',
        findReferences: 'Encontrar Referências',
        models: 'Modelos',
        textures: 'Texturas',
        audio: 'Áudio',
        scripts: 'Scripts',
        materials: 'Materiais',
        prefabs: 'Prefabs',
        scenes: 'Cenas',
        animations: 'Animações',
        shaders: 'Shaders',
        fonts: 'Fontes'
    },
    
    materials: {
        newMaterial: 'Novo Material',
        albedo: 'Albedo',
        normal: 'Normal',
        roughness: 'Rugosidade',
        metallic: 'Metálico',
        emission: 'Emissão',
        occlusion: 'Oclusão Ambiente',
        height: 'Altura',
        opacity: 'Opacidade',
        tiling: 'Repetição',
        offset: 'Deslocamento',
        shader: 'Shader',
        renderQueue: 'Fila de Renderização',
        doubleSided: 'Dupla Face',
        transparent: 'Transparente',
        alphaClip: 'Recorte Alfa'
    },
    
    animation: {
        play: 'Reproduzir',
        pause: 'Pausar',
        stop: 'Parar',
        loop: 'Loop',
        speed: 'Velocidade',
        keyframe: 'Quadro-chave',
        addKeyframe: 'Adicionar Quadro-chave',
        deleteKeyframe: 'Excluir Quadro-chave',
        curve: 'Curva',
        linear: 'Linear',
        bezier: 'Bezier',
        constant: 'Constante',
        record: 'Gravar',
        preview: 'Pré-visualizar',
        blend: 'Mesclagem',
        transition: 'Transição'
    },
    
    physics: {
        gravity: 'Gravidade',
        simulate: 'Simular',
        pause: 'Pausar',
        step: 'Passo',
        collisionLayers: 'Camadas de Colisão',
        raycast: 'Raycast',
        overlap: 'Sobreposição'
    },
    
    lighting: {
        intensity: 'Intensidade',
        color: 'Cor',
        range: 'Alcance',
        spotAngle: 'Ângulo do Spot',
        shadows: 'Sombras',
        shadowType: 'Tipo de Sombra',
        hard: 'Dura',
        soft: 'Suave',
        none: 'Nenhuma',
        shadowResolution: 'Resolução da Sombra',
        bias: 'Viés',
        normalBias: 'Viés Normal',
        bakeLighting: 'Assar Iluminação',
        realtime: 'Tempo Real',
        baked: 'Assada',
        mixed: 'Mista'
    },
    
    rendering: {
        quality: 'Qualidade',
        resolution: 'Resolução',
        antiAliasing: 'Anti-Serrilhamento',
        shadows: 'Sombras',
        bloom: 'Bloom',
        ambientOcclusion: 'Oclusão Ambiente',
        motionBlur: 'Desfoque de Movimento',
        depthOfField: 'Profundidade de Campo',
        colorGrading: 'Gradação de Cor',
        toneMappimg: 'Mapeamento de Tons',
        exposure: 'Exposição',
        vignette: 'Vinheta',
        chromaticAberration: 'Aberração Cromática',
        fog: 'Neblina',
        skybox: 'Skybox',
        reflections: 'Reflexos'
    },
    
    build: {
        platform: 'Plataforma',
        windows: 'Windows',
        mac: 'macOS',
        linux: 'Linux',
        webgl: 'WebGL',
        android: 'Android',
        ios: 'iOS',
        targetDirectory: 'Diretório de Destino',
        compression: 'Compressão',
        development: 'Desenvolvimento',
        release: 'Release',
        debug: 'Debug',
        includeSymbols: 'Incluir Símbolos de Debug',
        buildNumber: 'Número do Build',
        bundleId: 'Bundle ID',
        icon: 'Ícone',
        splash: 'Tela de Splash',
        startBuilding: 'Iniciar Build',
        buildComplete: 'Build Concluído',
        buildFailed: 'Build Falhou'
    },
    
    marketplace: {
        title: 'Marketplace',
        browse: 'Navegar',
        search: 'Buscar assets...',
        categories: 'Categorias',
        free: 'Grátis',
        paid: 'Pago',
        featured: 'Destaque',
        popular: 'Popular',
        newest: 'Mais Recentes',
        myLibrary: 'Minha Biblioteca',
        myAssets: 'Meus Assets',
        favorites: 'Favoritos',
        purchases: 'Compras',
        downloads: 'Downloads',
        upload: 'Upload',
        publish: 'Publicar',
        price: 'Preço',
        rating: 'Avaliação',
        reviews: 'Avaliações',
        download: 'Baixar',
        addToLibrary: 'Adicionar à Biblioteca',
        purchased: 'Comprado',
        owned: 'Possui',
        creator: 'Criador',
        license: 'Licença',
        compatibility: 'Compatibilidade',
        fileSize: 'Tamanho',
        version: 'Versão',
        lastUpdate: 'Última Atualização',
        description: 'Descrição',
        tags: 'Tags',
        preview: 'Pré-visualização',
        writeReview: 'Escrever Avaliação',
        report: 'Denunciar'
    },
    
    ai: {
        assistant: 'Assistente IA',
        generate: 'Gerar',
        generating: 'Gerando...',
        prompt: 'Digite seu prompt...',
        model: 'Modelo',
        creativity: 'Criatividade',
        askAnything: 'Pergunte qualquer coisa...',
        generateCode: 'Gerar Código',
        generateTexture: 'Gerar Textura',
        generateModel: 'Gerar Modelo 3D',
        generateAnimation: 'Gerar Animação',
        explain: 'Explicar',
        optimize: 'Otimizar',
        fix: 'Corrigir',
        suggestions: 'Sugestões',
        history: 'Histórico'
    },
    
    collaboration: {
        share: 'Compartilhar',
        invite: 'Convidar',
        collaborators: 'Colaboradores',
        online: 'Online',
        offline: 'Offline',
        editing: 'Editando',
        viewing: 'Visualizando',
        permissions: 'Permissões',
        owner: 'Proprietário',
        editor: 'Editor',
        viewer: 'Visualizador',
        chat: 'Chat',
        voice: 'Chat de Voz',
        cursor: 'Mostrar Cursores',
        follow: 'Seguir'
    },
    
    errors: {
        generic: 'Algo deu errado',
        networkError: 'Erro de rede. Verifique sua conexão.',
        fileNotFound: 'Arquivo não encontrado',
        accessDenied: 'Acesso negado',
        invalidFormat: 'Formato inválido',
        loadFailed: 'Falha ao carregar',
        saveFailed: 'Falha ao salvar',
        importFailed: 'Falha ao importar',
        exportFailed: 'Falha ao exportar',
        buildFailed: 'Build falhou',
        connectionLost: 'Conexão perdida',
        authRequired: 'Autenticação necessária',
        quotaExceeded: 'Cota de armazenamento excedida'
    },
    
    success: {
        saved: 'Salvo com sucesso',
        deleted: 'Excluído com sucesso',
        imported: 'Importado com sucesso',
        exported: 'Exportado com sucesso',
        published: 'Publicado com sucesso',
        downloaded: 'Baixado com sucesso',
        connected: 'Conectado',
        updated: 'Atualizado com sucesso'
    }
};

// ============================================================================
// SPANISH (es-ES)
// ============================================================================

export const es_ES: TranslationStrings = {
    common: {
        save: 'Guardar',
        cancel: 'Cancelar',
        delete: 'Eliminar',
        edit: 'Editar',
        create: 'Crear',
        open: 'Abrir',
        close: 'Cerrar',
        search: 'Buscar',
        filter: 'Filtrar',
        sort: 'Ordenar',
        loading: 'Cargando...',
        error: 'Error',
        success: 'Éxito',
        warning: 'Advertencia',
        info: 'Información',
        confirm: 'Confirmar',
        yes: 'Sí',
        no: 'No',
        ok: 'OK',
        apply: 'Aplicar',
        reset: 'Restablecer',
        undo: 'Deshacer',
        redo: 'Rehacer',
        copy: 'Copiar',
        paste: 'Pegar',
        cut: 'Cortar',
        duplicate: 'Duplicar',
        rename: 'Renombrar',
        refresh: 'Actualizar',
        settings: 'Configuración',
        help: 'Ayuda',
        about: 'Acerca de',
        version: 'Versión',
        language: 'Idioma',
        theme: 'Tema',
        dark: 'Oscuro',
        light: 'Claro',
        system: 'Sistema'
    },
    
    menu: {
        file: 'Archivo',
        newProject: 'Nuevo Proyecto',
        openProject: 'Abrir Proyecto',
        saveProject: 'Guardar Proyecto',
        saveAs: 'Guardar Como...',
        export: 'Exportar',
        import: 'Importar',
        recentProjects: 'Proyectos Recientes',
        exit: 'Salir',
        edit: 'Editar',
        selectAll: 'Seleccionar Todo',
        deselectAll: 'Deseleccionar Todo',
        preferences: 'Preferencias',
        view: 'Ver',
        viewport: 'Viewport',
        panels: 'Paneles',
        fullscreen: 'Pantalla Completa',
        resetLayout: 'Restablecer Diseño',
        project: 'Proyecto',
        projectSettings: 'Configuración del Proyecto',
        buildSettings: 'Configuración de Compilación',
        build: 'Compilar',
        buildAndRun: 'Compilar y Ejecutar',
        cleanBuild: 'Compilación Limpia',
        tools: 'Herramientas',
        packageManager: 'Gestor de Paquetes',
        pluginManager: 'Gestor de Plugins',
        console: 'Consola',
        profiler: 'Profiler',
        help: 'Ayuda',
        documentation: 'Documentación',
        tutorials: 'Tutoriales',
        reportBug: 'Reportar Error',
        checkUpdates: 'Buscar Actualizaciones'
    },
    
    panels: {
        hierarchy: 'Jerarquía',
        inspector: 'Inspector',
        project: 'Proyecto',
        console: 'Consola',
        animation: 'Animación',
        timeline: 'Línea de Tiempo',
        assets: 'Assets',
        materials: 'Materiales',
        layers: 'Capas',
        properties: 'Propiedades',
        nodeEditor: 'Editor de Nodos',
        scriptEditor: 'Editor de Scripts'
    },
    
    viewport: {
        perspective: 'Perspectiva',
        orthographic: 'Ortográfica',
        top: 'Superior',
        bottom: 'Inferior',
        front: 'Frontal',
        back: 'Trasera',
        left: 'Izquierda',
        right: 'Derecha',
        wireframe: 'Wireframe',
        solid: 'Sólido',
        textured: 'Texturizado',
        rendered: 'Renderizado',
        grid: 'Cuadrícula',
        snap: 'Ajustar',
        gizmo: 'Gizmo',
        translate: 'Mover',
        rotate: 'Rotar',
        scale: 'Escalar',
        local: 'Local',
        global: 'Global',
        pivot: 'Pivote',
        center: 'Centro'
    },
    
    scene: {
        newScene: 'Nueva Escena',
        loadScene: 'Cargar Escena',
        saveScene: 'Guardar Escena',
        sceneSettings: 'Configuración de Escena',
        addObject: 'Agregar Objeto',
        empty: 'Vacío',
        cube: 'Cubo',
        sphere: 'Esfera',
        cylinder: 'Cilindro',
        plane: 'Plano',
        camera: 'Cámara',
        light: 'Luz',
        directionalLight: 'Luz Direccional',
        pointLight: 'Luz Puntual',
        spotLight: 'Foco',
        areaLight: 'Luz de Área',
        ambientLight: 'Luz Ambiental',
        group: 'Grupo',
        prefab: 'Prefab'
    },
    
    inspector: {
        transform: 'Transformación',
        position: 'Posición',
        rotation: 'Rotación',
        scale: 'Escala',
        mesh: 'Malla',
        material: 'Material',
        physics: 'Física',
        rigidbody: 'Cuerpo Rígido',
        collider: 'Colisionador',
        script: 'Script',
        addComponent: 'Agregar Componente',
        removeComponent: 'Eliminar Componente',
        enabled: 'Activado',
        disabled: 'Desactivado',
        static: 'Estático',
        dynamic: 'Dinámico',
        kinematic: 'Cinemático',
        mass: 'Masa',
        friction: 'Fricción',
        bounciness: 'Rebote',
        drag: 'Arrastre',
        angularDrag: 'Arrastre Angular',
        useGravity: 'Usar Gravedad',
        isTrigger: 'Es Disparador'
    },
    
    assets: {
        import: 'Importar',
        refresh: 'Actualizar',
        createFolder: 'Crear Carpeta',
        createMaterial: 'Crear Material',
        createScript: 'Crear Script',
        createPrefab: 'Crear Prefab',
        createAnimation: 'Crear Animación',
        createShader: 'Crear Shader',
        showInExplorer: 'Mostrar en Explorador',
        reimport: 'Reimportar',
        delete: 'Eliminar',
        rename: 'Renombrar',
        copy: 'Copiar',
        paste: 'Pegar',
        duplicate: 'Duplicar',
        findReferences: 'Buscar Referencias',
        models: 'Modelos',
        textures: 'Texturas',
        audio: 'Audio',
        scripts: 'Scripts',
        materials: 'Materiales',
        prefabs: 'Prefabs',
        scenes: 'Escenas',
        animations: 'Animaciones',
        shaders: 'Shaders',
        fonts: 'Fuentes'
    },
    
    materials: {
        newMaterial: 'Nuevo Material',
        albedo: 'Albedo',
        normal: 'Normal',
        roughness: 'Rugosidad',
        metallic: 'Metálico',
        emission: 'Emisión',
        occlusion: 'Oclusión Ambiental',
        height: 'Altura',
        opacity: 'Opacidad',
        tiling: 'Repetición',
        offset: 'Desplazamiento',
        shader: 'Shader',
        renderQueue: 'Cola de Renderizado',
        doubleSided: 'Doble Cara',
        transparent: 'Transparente',
        alphaClip: 'Recorte Alfa'
    },
    
    animation: {
        play: 'Reproducir',
        pause: 'Pausar',
        stop: 'Detener',
        loop: 'Bucle',
        speed: 'Velocidad',
        keyframe: 'Fotograma Clave',
        addKeyframe: 'Agregar Fotograma Clave',
        deleteKeyframe: 'Eliminar Fotograma Clave',
        curve: 'Curva',
        linear: 'Lineal',
        bezier: 'Bezier',
        constant: 'Constante',
        record: 'Grabar',
        preview: 'Vista Previa',
        blend: 'Mezcla',
        transition: 'Transición'
    },
    
    physics: {
        gravity: 'Gravedad',
        simulate: 'Simular',
        pause: 'Pausar',
        step: 'Paso',
        collisionLayers: 'Capas de Colisión',
        raycast: 'Raycast',
        overlap: 'Solapamiento'
    },
    
    lighting: {
        intensity: 'Intensidad',
        color: 'Color',
        range: 'Alcance',
        spotAngle: 'Ángulo del Foco',
        shadows: 'Sombras',
        shadowType: 'Tipo de Sombra',
        hard: 'Dura',
        soft: 'Suave',
        none: 'Ninguna',
        shadowResolution: 'Resolución de Sombra',
        bias: 'Sesgo',
        normalBias: 'Sesgo Normal',
        bakeLighting: 'Hornear Iluminación',
        realtime: 'Tiempo Real',
        baked: 'Horneada',
        mixed: 'Mixta'
    },
    
    rendering: {
        quality: 'Calidad',
        resolution: 'Resolución',
        antiAliasing: 'Anti-Aliasing',
        shadows: 'Sombras',
        bloom: 'Bloom',
        ambientOcclusion: 'Oclusión Ambiental',
        motionBlur: 'Desenfoque de Movimiento',
        depthOfField: 'Profundidad de Campo',
        colorGrading: 'Gradación de Color',
        toneMappimg: 'Mapeo de Tonos',
        exposure: 'Exposición',
        vignette: 'Viñeta',
        chromaticAberration: 'Aberración Cromática',
        fog: 'Niebla',
        skybox: 'Skybox',
        reflections: 'Reflejos'
    },
    
    build: {
        platform: 'Plataforma',
        windows: 'Windows',
        mac: 'macOS',
        linux: 'Linux',
        webgl: 'WebGL',
        android: 'Android',
        ios: 'iOS',
        targetDirectory: 'Directorio de Destino',
        compression: 'Compresión',
        development: 'Desarrollo',
        release: 'Release',
        debug: 'Debug',
        includeSymbols: 'Incluir Símbolos de Debug',
        buildNumber: 'Número de Compilación',
        bundleId: 'Bundle ID',
        icon: 'Icono',
        splash: 'Pantalla de Inicio',
        startBuilding: 'Iniciar Compilación',
        buildComplete: 'Compilación Completa',
        buildFailed: 'Compilación Fallida'
    },
    
    marketplace: {
        title: 'Marketplace',
        browse: 'Explorar',
        search: 'Buscar assets...',
        categories: 'Categorías',
        free: 'Gratis',
        paid: 'De Pago',
        featured: 'Destacados',
        popular: 'Popular',
        newest: 'Más Recientes',
        myLibrary: 'Mi Biblioteca',
        myAssets: 'Mis Assets',
        favorites: 'Favoritos',
        purchases: 'Compras',
        downloads: 'Descargas',
        upload: 'Subir',
        publish: 'Publicar',
        price: 'Precio',
        rating: 'Valoración',
        reviews: 'Reseñas',
        download: 'Descargar',
        addToLibrary: 'Agregar a Biblioteca',
        purchased: 'Comprado',
        owned: 'Poseído',
        creator: 'Creador',
        license: 'Licencia',
        compatibility: 'Compatibilidad',
        fileSize: 'Tamaño',
        version: 'Versión',
        lastUpdate: 'Última Actualización',
        description: 'Descripción',
        tags: 'Etiquetas',
        preview: 'Vista Previa',
        writeReview: 'Escribir Reseña',
        report: 'Reportar'
    },
    
    ai: {
        assistant: 'Asistente IA',
        generate: 'Generar',
        generating: 'Generando...',
        prompt: 'Escribe tu prompt...',
        model: 'Modelo',
        creativity: 'Creatividad',
        askAnything: 'Pregunta lo que quieras...',
        generateCode: 'Generar Código',
        generateTexture: 'Generar Textura',
        generateModel: 'Generar Modelo 3D',
        generateAnimation: 'Generar Animación',
        explain: 'Explicar',
        optimize: 'Optimizar',
        fix: 'Corregir',
        suggestions: 'Sugerencias',
        history: 'Historial'
    },
    
    collaboration: {
        share: 'Compartir',
        invite: 'Invitar',
        collaborators: 'Colaboradores',
        online: 'En Línea',
        offline: 'Desconectado',
        editing: 'Editando',
        viewing: 'Viendo',
        permissions: 'Permisos',
        owner: 'Propietario',
        editor: 'Editor',
        viewer: 'Espectador',
        chat: 'Chat',
        voice: 'Chat de Voz',
        cursor: 'Mostrar Cursores',
        follow: 'Seguir'
    },
    
    errors: {
        generic: 'Algo salió mal',
        networkError: 'Error de red. Comprueba tu conexión.',
        fileNotFound: 'Archivo no encontrado',
        accessDenied: 'Acceso denegado',
        invalidFormat: 'Formato inválido',
        loadFailed: 'Error al cargar',
        saveFailed: 'Error al guardar',
        importFailed: 'Error al importar',
        exportFailed: 'Error al exportar',
        buildFailed: 'Compilación fallida',
        connectionLost: 'Conexión perdida',
        authRequired: 'Autenticación requerida',
        quotaExceeded: 'Cuota de almacenamiento excedida'
    },
    
    success: {
        saved: 'Guardado exitosamente',
        deleted: 'Eliminado exitosamente',
        imported: 'Importado exitosamente',
        exported: 'Exportado exitosamente',
        published: 'Publicado exitosamente',
        downloaded: 'Descargado exitosamente',
        connected: 'Conectado',
        updated: 'Actualizado exitosamente'
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

export const translations: Record<string, TranslationStrings> = {
    'en-US': en_US,
    'en': en_US,
    'pt-BR': pt_BR,
    'pt': pt_BR,
    'es-ES': es_ES,
    'es': es_ES
};

export const supportedLanguages = [
    { code: 'en-US', name: 'English (US)', nativeName: 'English' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)' },
    { code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español (España)' }
];

export function getTranslation(locale: string): TranslationStrings {
    return translations[locale] || translations['en-US'];
}

export default translations;
