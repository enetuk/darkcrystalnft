ts-node ./js/packages/cli/src/cli-nft.ts generate_agents --keypair ~/.config/solana/id.json --count-nft 2


ts-node ./js/packages/cli/src/cli-nft.ts generate_agents --keypair ~/.config/solana/id.json --count-nft 100 --config ./config.json




#Генерация агента
ts-node ./js/packages/cli/src/cli-nft.ts generate_agents --keypair ~/.config/solana/id.json --count-nft 2 --config ./config.json


#Генерация лутбокса
ts-node ./js/packages/cli/src/cli-nft.ts create_lootboxes --keypair ~/.config/solana/id.json --count-nft 2 --config ./config.json --series-name "Test Lootboxes"


#Открытие лутбокса
ts-node ./js/packages/cli/src/cli-nft.ts open_lootbox --keypair ~/.config/solana/id.json --config ./config.json --nft-address 222 


#Сжечь NFT
 ts-node ./js/packages/cli/src/cli-nft.ts burn_nft --keypair ~/.config/solana/id_remote.json --nft-address 3LWpMzzGfsa27f8Vd28pbPrbvXNdm9jwRCKTHgonQpA8