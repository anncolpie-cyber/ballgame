export const FarmerVsGrannyBattle = {
  id: 'farmer-vs-granny',
  title: [
    { label: 'Farmer', className: 'farmerText' },
    { label: 'Granny', className: 'grannyText' }
  ],
  activeSkillBars: ['white', 'granny'],
  fighters: [
    {
      slot: 'white',
      kind: 'white',
      hp: 150,
      spawn: ({ arenaSize }) => ({
        x: arenaSize - 110,
        y: arenaSize - 110
      })
    },
    {
      slot: 'granny',
      kind: 'granny',
      hp: 150,
      spawn: ({ arenaSize }) => ({
        x: arenaSize - 98,
        y: 70
      })
    }
  ]
};
