#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

#include "ultima/nuvie/sound/adplug/fm_opl.h"

namespace {

constexpr int kSampleRate = 44100;
constexpr int kTickHz = 60;
constexpr int kSamplesPerTick = kSampleRate / kTickHz;

struct Write {
  uint32_t tick;
  uint8_t reg;
  uint8_t value;
};

void put_u16(std::ofstream &out, uint16_t v) {
  out.put(static_cast<char>(v & 0xff));
  out.put(static_cast<char>((v >> 8) & 0xff));
}

void put_u32(std::ofstream &out, uint32_t v) {
  out.put(static_cast<char>(v & 0xff));
  out.put(static_cast<char>((v >> 8) & 0xff));
  out.put(static_cast<char>((v >> 16) & 0xff));
  out.put(static_cast<char>((v >> 24) & 0xff));
}

bool write_wav(const std::string &path, const std::vector<int16_t> &samples) {
  std::ofstream out(path, std::ios::binary);
  if (!out) return false;
  const uint32_t data_bytes = static_cast<uint32_t>(samples.size() * sizeof(int16_t));
  out.write("RIFF", 4);
  put_u32(out, 36 + data_bytes);
  out.write("WAVE", 4);
  out.write("fmt ", 4);
  put_u32(out, 16);
  put_u16(out, 1);
  put_u16(out, 1);
  put_u32(out, kSampleRate);
  put_u32(out, kSampleRate * 2);
  put_u16(out, 2);
  put_u16(out, 16);
  out.write("data", 4);
  put_u32(out, data_bytes);
  out.write(reinterpret_cast<const char *>(samples.data()), data_bytes);
  return true;
}

} // namespace

int main(int argc, char **argv) {
  if (argc < 2) {
    std::cerr << "usage: opl_register_render <out.wav> [tail_ticks]\n";
    return 2;
  }
  const std::string out_path = argv[1];
  const uint32_t tail_ticks = argc >= 3 ? static_cast<uint32_t>(std::strtoul(argv[2], nullptr, 10)) : 120;
  std::vector<Write> writes;
  uint32_t tick = 0;
  uint32_t reg = 0;
  uint32_t value = 0;
  while (std::cin >> tick >> std::hex >> reg >> value >> std::dec) {
    writes.push_back({tick, static_cast<uint8_t>(reg & 0xff), static_cast<uint8_t>(value & 0xff)});
  }
  if (Ultima::Nuvie::YM3812Init(1, 3579545, kSampleRate) != 0) {
    std::cerr << "YM3812Init failed\n";
    return 1;
  }
  Ultima::Nuvie::YM3812ResetChip(0);

  std::vector<int16_t> pcm;
  std::vector<int16_t> tmp(kSamplesPerTick);
  size_t at = 0;
  const uint32_t last_tick = writes.empty() ? 0 : writes.back().tick + tail_ticks;
  for (uint32_t t = 0; t <= last_tick; t += 1) {
    while (at < writes.size() && writes[at].tick == t) {
      Ultima::Nuvie::YM3812Write(0, 0, writes[at].reg);
      Ultima::Nuvie::YM3812Write(0, 1, writes[at].value);
      at += 1;
    }
    std::memset(tmp.data(), 0, tmp.size() * sizeof(int16_t));
    Ultima::Nuvie::YM3812UpdateOne(0, tmp.data(), static_cast<int>(tmp.size()));
    pcm.insert(pcm.end(), tmp.begin(), tmp.end());
  }
  Ultima::Nuvie::YM3812Shutdown();

  if (!write_wav(out_path, pcm)) {
    std::cerr << "failed to write " << out_path << "\n";
    return 1;
  }
  return 0;
}
