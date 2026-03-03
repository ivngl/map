import { Group, HoverCard, Text } from '@mantine/core';


//@ts-ignore
type PopoverBlockType = {
  text: string
  children: any
}

export function PopoverBlock({text, children}: PopoverBlockType) {
  return (
     <Group justify="center">
      <HoverCard width={280} shadow="md">
        <HoverCard.Target>
         {children}
        </HoverCard.Target>
        <HoverCard.Dropdown>
          <Text size="sm">
            {text}
          </Text>
        </HoverCard.Dropdown>
      </HoverCard>
    </Group>
  );
}