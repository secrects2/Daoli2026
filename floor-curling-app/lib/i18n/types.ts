export type Language = 'zh-TW' | 'zh-CN' | 'en'

export interface Translations {
    common: {
        loading: string
        error: string
        save: string
        cancel: string
        confirm: string
        success: string
        back: string
        logout: string
        language: string
    }
    login: {
        title: string
        subtitle: string
        emailLabel: string
        passwordLabel: string
        emailPlaceholder: string
        passwordPlaceholder: string
        signInButton: string
        signInLoading: string
        errorMessage: string
    }
    dashboard: {
        title: string
        role: string
        welcome: string
        storeId: string
        nav: {
            newMatch: string
            matchHistory: string
            elderManage: string
            equipment: string
            leaderboard: string
            shop: string
        }
        cards: {
            newMatch: {
                title: string
                desc: string
            }
            matchHistory: {
                title: string
                desc: string
            }
            elderManage: {
                title: string
                desc: string
            }
            equipment: {
                title: string
                desc: string
            }
            leaderboard: {
                title: string
                desc: string
            }
            shop: {
                title: string
                desc: string
            }
        }
        stats: {
            todayMatches: string
            activeElders: string
            totalPoints: string
            totalEquipment: string
            recentTrend: string
            winDistribution: string
            redWin: string
            yellowWin: string
            matchCount: string
        }
    }
    matchNew: {
        title: string
        subtitle: string
        storeId: string
        redElderId: string
        yellowElderId: string
        redTeam: string
        yellowTeam: string
        addEnd: string
        end: string
        redScore: string
        yellowScore: string
        camBPrompt: string
        camAPrompt: string
        submit: string
        submitting: string
        cancel: string
        validation: {
            required: string
            sameElder: string
            atLeastOneEnd: string
            missingPhoto: string
            success: string
        }
    }
    matchHistory: {
        title: string
        newMatch: string
        filter: {
            all: string
            inProgress: string
            completed: string
        }
        empty: {
            title: string
            desc: string
            action: string
        }
        status: {
            completed: string
            inProgress: string
        }
        result: {
            redWin: string
            yellowWin: string
        }
        store: string
        red: string
        yellow: string
        endsDetail: string
        endN: string
    }
    leaderboard: {
        title: string
        scope: {
            global: string
            store: string
        }
        empty: {
            title: string
            desc: string
        }
        list: {
            store: string
            points: string
            scoreUnit: string
        }
    }
    shop: {
        title: string
        balanceLabel: string
        rarity: {
            all: string
            common: string
            rare: string
            epic: string
            legendary: string
        }
        empty: {
            title: string
            desc: string
        }
        buy: string
        buying: string
        insufficient: string
        failed: string
        success: string
    }
    elders: {
        title: string
        total: string
        searchPlaceholder: string
        emptySearch: {
            title: string
            desc: string
        }
        empty: {
            title: string
            desc: string
        }
        registeredAt: string
        points: {
            global: string
            local: string
        }
        stats: {
            title: string
            matches: string
            wins: string
            losses: string
            rate: string
        }
        store: string
    }
    equipment: {
        title: string
        total: string
        emptyRarity: string
        empty: string
        emptyDesc: string
        attributes: string
        stat: {
            speed: string
            control: string
            accuracy: string
            defense: string
            stability: string
            power: string
        }
    }
}
