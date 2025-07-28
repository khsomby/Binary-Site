# Dockerfile pour Minecraft Bedrock 1.20.0.01
FROM itzg/minecraft-bedrock-server:latest

# Configuration de la version, accepte l'EULA
ENV VERSION=1.20.0.01
ENV EULA=TRUE
ENV GAMEMODE=survival
ENV DIFFICULTY=normal
ENV ONLINE_MODE=false
ENV ALLOW_CHEATS=true
ENV MAX_PLAYERS=10
ENV SERVER_NAME="LiteGixServer"

# Expose le port UDP 19132 (important pour Bedrock)
EXPOSE 19132/udp

# Utilisateur non root
USER minecraft
