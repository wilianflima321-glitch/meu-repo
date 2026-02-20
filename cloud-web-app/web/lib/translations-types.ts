/**
 * AETHEL ENGINE - i18n Translation Types
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
