import shutil
import os

file_names = sorted((fn for fn in os.listdir('.') if fn.endswith('.png')))
print(file_names)

dst = "a"
durations = [0.7,0.3,0.3,0.7]
fps = 24

i = 0
for (img, _d) in zip(file_names, durations):
    d = int(_d * fps)
    for _ in range(d):
        shutil.copyfile(img, '{}/image{}.png'.format(dst,i))
        i += 1

print("Now open in GIMP through 'File->Open as layers' and save as GIF")