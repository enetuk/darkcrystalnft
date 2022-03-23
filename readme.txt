ts-node ./js/packages/cli/src/cli-nft.ts generate_agents --keypair ~/.config/solana/id.json --count-nft 2


ts-node ./js/packages/cli/src/cli-nft.ts generate_agents --keypair ~/.config/solana/id.json --count-nft 100 --config ./config.json




#Генерация агента
ts-node ./js/packages/cli/src/cli-nft.ts generate_agents --keypair ~/.config/solana/id.json --count-nft 2 --config ./config.json


#Генерация лутбокса
ts-node ./js/packages/cli/src/cli-nft.ts create_lootboxes --keypair ~/.config/solana/id.json --count-nft 2 --config ./config.json --series-name "Test Lootboxes"
