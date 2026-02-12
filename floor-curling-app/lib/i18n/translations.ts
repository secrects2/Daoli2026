import { Translations } from './types'

export const translations: Record<string, Translations> = {
    'zh-TW': {
        common: {
            loading: '載入中...',
            error: '發生錯誤',
            save: '儲存',
            cancel: '取消',
            confirm: '確認',
            success: '成功',
            back: '返回',
            logout: '登出',
            language: '語言'
        },
        login: {
            title: '登入您的帳戶',
            subtitle: '地壺球管理系統',
            emailLabel: '電子郵件地址',
            passwordLabel: '密碼',
            emailPlaceholder: '您的電子郵件',
            passwordPlaceholder: '您的密碼',
            signInButton: '登入',
            signInLoading: '登入中...',
            errorMessage: '登入失敗，請檢查您的帳號密碼'
        },
        dashboard: {
            title: '藥師儀表板',
            role: '角色',
            welcome: '歡迎回來！',
            storeId: '店鋪 ID',
            nav: {
                newMatch: '新建',
                matchHistory: '查看',
                elderManage: '管理',
                equipment: '庫存',
                leaderboard: '排名',
                shop: '商城'
            },
            cards: {
                newMatch: {
                    title: '建立比賽',
                    desc: '開始一場新的地壺球比賽'
                },
                matchHistory: {
                    title: '比賽記錄',
                    desc: '查看歷史比賽和統計'
                },
                elderManage: {
                    title: '長者管理',
                    desc: '管理長者檔案和積分'
                },
                equipment: {
                    title: '裝備庫存',
                    desc: '管理地壺球裝備'
                },
                leaderboard: {
                    title: '積分排行榜',
                    desc: '查看長者積分排名'
                },
                shop: {
                    title: '裝備商城',
                    desc: '使用積分兌換裝備'
                }
            },
            stats: {
                todayMatches: '今日比賽',
                activeElders: '活躍長者',
                totalPoints: '總積分',
                totalEquipment: '裝備總數',
                recentTrend: '近 7 日店鋪活躍趨勢',
                winDistribution: '紅黃方勝率分佈',
                redWin: '紅方勝',
                yellowWin: '黃方勝',
                matchCount: '比賽場數'
            }
        },
        matchNew: {
            title: '建立新比賽',
            subtitle: '雙機流計分系統',
            storeId: '店鋪 ID',
            autoFilled: '自動帶入',
            loadingStoreId: '載入店鋪 ID 中...',
            matchMode: '比賽模式',
            live: '比賽中',
            redElderId: '紅方長者 ID',
            yellowElderId: '黃方長者 ID',
            redTeam: '紅方',
            yellowTeam: '黃方',
            addEnd: '新增回合',
            end: '第 {n} 回合',
            redScore: '紅方得分',
            yellowScore: '黃方得分',
            camBPrompt: '📷 Cam B - 證明照片',
            camAPrompt: '🎬 Cam A - 開心影片',
            submit: '建立比賽',
            submitting: '處理中...',
            cancel: '取消',
            validation: {
                required: '請填寫所有必填資訊',
                sameElder: '紅方和黃方不能是同一位長者',
                atLeastOneEnd: '至少需要新增一個回合',
                missingPhoto: '第 {ends} 回合缺少證明照片，無法寫入積分',
                success: '比賽建立成功！積分已更新，並已通知家屬。'
            },
            gameEnds: '比賽局數',
            noEnds: '尚未記錄任何局數',
            startRecording: '點擊「新增一局」開始記錄分數',
            uploadingFiles: '正在上傳檔案...',
            uploadingPhoto: '正在上傳第 {n} 局照片...',
            uploadingVideo: '正在上傳第 {n} 局影片...',
            processing: '處理中...',
            waitingPlayer: '等待加入...',
            scanOrType: '掃描或輸入 ID...',
            maxPlayer: '此模式每隊最多 {n} 人',
            idExists: '此 ID 已存在',
            maxEnds: '最多 6 局'
        },
        matchHistory: {
            title: '比賽記錄',
            newMatch: '新建比賽',
            filter: {
                all: '全部',
                inProgress: '進行中',
                completed: '已完成'
            },
            empty: {
                title: '暫無比賽記錄',
                desc: '開始建立您的第一場比賽吧！',
                action: '建立新比賽'
            },
            status: {
                completed: '已完成',
                inProgress: '進行中'
            },
            result: {
                redWin: '🏆 紅方獲勝',
                yellowWin: '🏆 黃方獲勝'
            },
            store: '店鋪',
            red: '紅方',
            yellow: '黃方',
            endsDetail: '回合詳情',
            endN: '第{n}局'
        },
        leaderboard: {
            title: '🏆 積分排行榜',
            scope: {
                global: '🌍 全球排名',
                store: '🏪 店鋪排名'
            },
            empty: {
                title: '暫無排名數據',
                desc: '開始比賽即可獲得積分！'
            },
            list: {
                store: '店鋪',
                points: '榮譽積分',
                scoreUnit: '分'
            }
        },
        shop: {
            title: '🛒 裝備商城',
            balanceLabel: '兌換積分',
            rarity: {
                all: '全部',
                common: '普通',
                rare: '稀有',
                epic: '史詩',
                legendary: '傳說'
            },
            empty: {
                title: '暫無裝備',
                desc: '商城正在補貨中...'
            },
            buy: '購買',
            buying: '購買中...',
            insufficient: '積分不足',
            failed: '購買失敗',
            success: '🎉 成功購買 {item}！'
        },
        elders: {
            title: '長者管理',
            total: '共 {n} 位長者',
            searchPlaceholder: '搜尋長者 ID 或店鋪...',
            emptySearch: {
                title: '未找到匹配的長者',
                desc: '請嘗試其他搜尋條件'
            },
            empty: {
                title: '暫無長者數據',
                desc: '長者將在註冊後顯示在這裡'
            },
            registeredAt: '註冊於',
            points: {
                global: '榮譽積分',
                local: '兌換積分'
            },
            stats: {
                title: '比賽統計',
                matches: '總場次',
                wins: '勝',
                losses: '負',
                rate: '勝率'
            },
            store: '所屬店鋪'
        },
        equipment: {
            title: '裝備管理',
            total: '共 {n} 件裝備',
            emptyRarity: '該稀有度暫無裝備',
            empty: '暫無裝備數據',
            emptyDesc: '裝備數據將在資料庫中新增後顯示',
            attributes: '裝備屬性',
            stat: {
                speed: '速度',
                control: '控制',
                accuracy: '準度',
                defense: '防守',
                stability: '穩定',
                power: '力量'
            }
        }
    },
    'zh-CN': {
        common: {
            loading: '加载中...',
            error: '发生错误',
            save: '保存',
            cancel: '取消',
            confirm: '确认',
            success: '成功',
            back: '返回',
            logout: '登出',
            language: '语言'
        },
        login: {
            title: '登录您的账户',
            subtitle: '地壶球管理系统',
            emailLabel: '电子邮件地址',
            passwordLabel: '密码',
            emailPlaceholder: '您的电子邮箱',
            passwordPlaceholder: '您的密码',
            signInButton: '登录',
            signInLoading: '登录中...',
            errorMessage: '登录失败，请检查您的账号密码'
        },
        dashboard: {
            title: '药师仪表板',
            role: '角色',
            welcome: '欢迎回来！',
            storeId: '店铺 ID',
            nav: {
                newMatch: '新建',
                matchHistory: '查看',
                elderManage: '管理',
                equipment: '库存',
                leaderboard: '排名',
                shop: '商城'
            },
            cards: {
                newMatch: {
                    title: '创建比赛',
                    desc: '开始一场新的地壶球比赛'
                },
                matchHistory: {
                    title: '比赛记录',
                    desc: '查看历史比赛和统计'
                },
                elderManage: {
                    title: '长者管理',
                    desc: '管理长者档案和积分'
                },
                equipment: {
                    title: '装备库存',
                    desc: '管理地壶球装备'
                },
                leaderboard: {
                    title: '积分排行榜',
                    desc: '查看长者积分排名'
                },
                shop: {
                    title: '装备商城',
                    desc: '使用积分兑换装备'
                }
            },
            stats: {
                todayMatches: '今日比赛',
                activeElders: '活跃长者',
                totalPoints: '总积分',
                totalEquipment: '装备总数',
                recentTrend: '近 7 日店铺活跃趋势',
                winDistribution: '红黄方胜率分布',
                redWin: '红方胜',
                yellowWin: '黄方胜',
                matchCount: '比赛场数'
            }
        },
        matchNew: {
            title: '创建新比赛',
            subtitle: '双机流计分系统',
            storeId: '店铺 ID',
            autoFilled: '自动带入',
            loadingStoreId: '加载店铺 ID 中...',
            matchMode: '比赛模式',
            live: '比赛中',
            redElderId: '红方长者 ID',
            yellowElderId: '黄方长者 ID',
            redTeam: '红方',
            yellowTeam: '黄方',
            addEnd: '添加回合',
            end: '第 {n} 回合',
            redScore: '红方得分',
            yellowScore: '黄方得分',
            camBPrompt: '📷 Cam B - 证明照片',
            camAPrompt: '🎬 Cam A - 开心视频',
            submit: '创建比赛',
            submitting: '处理中...',
            cancel: '取消',
            validation: {
                required: '请填写所有必填信息',
                sameElder: '红方和黄方不能是同一个长者',
                atLeastOneEnd: '至少需要添加一个回合',
                missingPhoto: '第 {ends} 回合缺少证明照片，无法写入积分',
                success: '比赛创建成功！积分已更新，并已通知家属。'
            },
            gameEnds: '比赛局数',
            noEnds: '尚未记录任何局数',
            startRecording: '点击“添加回合”开始记录分数',
            uploadingFiles: '正在上传文件...',
            uploadingPhoto: '正在上传第 {n} 局照片...',
            uploadingVideo: '正在上传第 {n} 局视频...',
            processing: '处理中...',
            waitingPlayer: '等待加入...',
            scanOrType: '扫描 or 输入 ID...',
            maxPlayer: '此模式每队最多 {n} 人',
            idExists: '此 ID 已存在',
            maxEnds: '最多 6 局'
        },
        matchHistory: {
            title: '比赛记录',
            newMatch: '新建比赛',
            filter: {
                all: '全部',
                inProgress: '进行中',
                completed: '已完成'
            },
            empty: {
                title: '暂无比赛记录',
                desc: '开始创建您的第一场比赛吧！',
                action: '创建新比赛'
            },
            status: {
                completed: '已完成',
                inProgress: '进行中'
            },
            result: {
                redWin: '🏆 红方获胜',
                yellowWin: '🏆 黃方獲勝'
            },
            store: '店铺',
            red: '红方',
            yellow: '黄方',
            endsDetail: '回合详情',
            endN: '第{n}局'
        },
        leaderboard: {
            title: '🏆 积分排行榜',
            scope: {
                global: '🌍 全球排名',
                store: '🏪 店铺排名'
            },
            empty: {
                title: '暂无排名数据',
                desc: '开始比赛即可获得积分！'
            },
            list: {
                store: '店铺',
                points: '荣誉积分',
                scoreUnit: '分'
            }
        },
        shop: {
            title: '🛒 装备商城',
            balanceLabel: '兑换积分',
            rarity: {
                all: '全部',
                common: '普通',
                rare: '稀有',
                epic: '史诗',
                legendary: '传说'
            },
            empty: {
                title: '暂无装备',
                desc: '商城正在补货中...'
            },
            buy: '购买',
            buying: '购买中...',
            insufficient: '积分不足',
            failed: '购买失败',
            success: '🎉 成功购买 {item}！'
        },
        elders: {
            title: '长者管理',
            total: '共 {n} 位长者',
            searchPlaceholder: '搜索长者 ID 或店铺...',
            emptySearch: {
                title: '未找到匹配的长者',
                desc: '请尝试其他搜索条件'
            },
            empty: {
                title: '暂无长者数据',
                desc: '长者将在注册后显示在这里'
            },
            registeredAt: '注册于',
            points: {
                global: '荣誉积分',
                local: '兑换积分'
            },
            stats: {
                title: '比赛统计',
                matches: '总场次',
                wins: '胜',
                losses: '负',
                rate: '胜率'
            },
            store: '所属店铺'
        },
        equipment: {
            title: '装备管理',
            total: '共 {n} 件装备',
            emptyRarity: '该稀有度暂无装备',
            empty: '暂无装备数据',
            emptyDesc: '装备数据将在数据库中添加后显示',
            attributes: '装备属性',
            stat: {
                speed: '速度',
                control: '控制',
                accuracy: '准度',
                defense: '防守',
                stability: '稳定',
                power: '力量'
            }
        }
    },
    'en': {
        common: {
            loading: 'Loading...',
            error: 'Error occurred',
            save: 'Save',
            cancel: 'Cancel',
            confirm: 'Confirm',
            success: 'Success',
            back: 'Back',
            logout: 'Log out',
            language: 'Language'
        },
        login: {
            title: 'Sign in to your account',
            subtitle: 'Floor Curling Management System',
            emailLabel: 'Email address',
            passwordLabel: 'Password',
            emailPlaceholder: 'Your email',
            passwordPlaceholder: 'Your password',
            signInButton: 'Sign in',
            signInLoading: 'Signing in...',
            errorMessage: 'Login failed, please check your credentials'
        },
        dashboard: {
            title: 'Pharmacist Dashboard',
            role: 'Role',
            welcome: 'Welcome back!',
            storeId: 'Store ID',
            nav: {
                newMatch: 'New',
                matchHistory: 'History',
                elderManage: 'Manage',
                equipment: 'Stock',
                leaderboard: 'Rank',
                shop: 'Shop'
            },
            cards: {
                newMatch: {
                    title: 'New Match',
                    desc: 'Start a new floor curling match'
                },
                matchHistory: {
                    title: 'Match History',
                    desc: 'View history and statistics'
                },
                elderManage: {
                    title: 'Elder Manage',
                    desc: 'Manage profiles and points'
                },
                equipment: {
                    title: 'Equipment',
                    desc: 'Manage inventory'
                },
                leaderboard: {
                    title: 'Leaderboard',
                    desc: 'View points ranking'
                },
                shop: {
                    title: 'Shop',
                    desc: 'Redeem points for equipment'
                }
            },
            stats: {
                todayMatches: 'Today Matches',
                activeElders: 'Active Elders',
                totalPoints: 'Total Points',
                totalEquipment: 'Total Equipment',
                recentTrend: '7-Day Activity Trend',
                winDistribution: 'Win Rate Distribution',
                redWin: 'Red Wins',
                yellowWin: 'Yellow Wins',
                matchCount: 'Matches'
            }
        },
        matchNew: {
            title: 'Create New Match',
            subtitle: 'Dual-Camera Scoring System',
            storeId: 'Store ID',
            autoFilled: 'Auto-filled',
            loadingStoreId: 'Loading Store ID...',
            matchMode: 'Match Mode',
            live: 'LIVE',
            redElderId: 'Red Elder ID',
            yellowElderId: 'Yellow Elder ID',
            redTeam: 'Red Team',
            yellowTeam: 'Yellow Team',
            addEnd: 'Add End',
            end: 'End {n}',
            redScore: 'Red Score',
            yellowScore: 'Yellow Score',
            camBPrompt: '📷 Cam B - Evidence Photo',
            camAPrompt: '🎬 Cam A - Vibe Video',
            submit: 'Create Match',
            submitting: 'Processing...',
            cancel: 'Cancel',
            validation: {
                required: 'Please fill in all required fields',
                sameElder: 'Red and Yellow cannot be the same elder',
                atLeastOneEnd: 'At least one end is required',
                missingPhoto: 'End {ends} is missing evidence photo, points cannot be recorded',
                success: 'Match created successfully! Points updated and family notified.'
            },
            gameEnds: 'Game Ends',
            noEnds: 'No ends recorded yet',
            startRecording: 'Press "Add End" to start recording scores',
            uploadingFiles: 'Uploading Files...',
            uploadingPhoto: 'Uploading End {n} Photo...',
            uploadingVideo: 'Uploading End {n} Video...',
            processing: 'Processing...',
            waitingPlayer: 'Waiting for player...',
            scanOrType: 'Scan or Type ID...',
            maxPlayer: 'Max {n} players per team in this mode',
            idExists: 'ID already exists',
            maxEnds: 'Max 6 ends'
        },
        matchHistory: {
            title: 'Match History',
            newMatch: 'New Match',
            filter: {
                all: 'All',
                inProgress: 'In Progress',
                completed: 'Completed'
            },
            empty: {
                title: 'No Matches Yet',
                desc: 'Start creating your first match!',
                action: 'Create New Match'
            },
            status: {
                completed: 'Completed',
                inProgress: 'In Progress'
            },
            result: {
                redWin: '🏆 Red Wins',
                yellowWin: '🏆 Yellow Wins'
            },
            store: 'Store',
            red: 'Red',
            yellow: 'Yellow',
            endsDetail: 'Ends Detail',
            endN: 'End {n}'
        },
        leaderboard: {
            title: '🏆 Leaderboard',
            scope: {
                global: '🌍 Global Rank',
                store: '🏪 Store Rank'
            },
            empty: {
                title: 'No Ranking Data',
                desc: 'Start matches to earn points!'
            },
            list: {
                store: 'Store',
                points: 'Honor Points',
                scoreUnit: 'pts'
            }
        },
        shop: {
            title: '🛒 Equipment Shop',
            balanceLabel: 'Points',
            rarity: {
                all: 'All',
                common: 'Common',
                rare: 'Rare',
                epic: 'Epic',
                legendary: 'Legendary'
            },
            empty: {
                title: 'No Equipment',
                desc: 'Restocking soon...'
            },
            buy: 'Buy',
            buying: 'Purchasing...',
            insufficient: 'Insufficient Points',
            failed: 'Purchase Failed',
            success: '🎉 Purchased {item}!',
        },
        elders: {
            title: 'Elder Manage',
            total: '{n} Elders Total',
            searchPlaceholder: 'Search Elder ID or Store...',
            emptySearch: {
                title: 'No matching elders found',
                desc: 'Try different search criteria'
            },
            empty: {
                title: 'No Elder Data',
                desc: 'Elders will appear here after registration'
            },
            registeredAt: 'Registered at',
            points: {
                global: 'Honor Points',
                local: 'Redeem Points'
            },
            stats: {
                title: 'Match Stats',
                matches: 'Total',
                wins: 'W',
                losses: 'L',
                rate: 'Win Rate'
            },
            store: 'Store'
        },
        equipment: {
            title: 'Equipment Manage',
            total: '{n} Items Total',
            emptyRarity: 'No items in this rarity',
            empty: 'No Equipment Data',
            emptyDesc: 'Items will appear here after being added to DB',
            attributes: 'Attributes',
            stat: {
                speed: 'Speed',
                control: 'Control',
                accuracy: 'Accuracy',
                defense: 'Defense',
                stability: 'Stability',
                power: 'Power'
            }
        }
    }
}
